import { supabase } from '@/lib/supabase/client';
import { TelnyxClient } from './telnyxClient';

interface AgentConfig {
  id: string;
  tenant_id: string;
  agent_type: 'sales_outbound' | 'sales_inbound' | 'support_inbound' | 'general';
  max_concurrent_calls: number;
  business_hours: Record<string, { enabled: boolean; start: string; end: string }>;
  timezone: string;
  after_hours_action: string;
  after_hours_forward_number?: string;
  is_active: boolean;
}

interface EscalationRule {
  id: string;
  rule_name: string;
  priority: number;
  trigger_type: string;
  keywords?: string[];
  sentiment_threshold?: number;
  duration_threshold_seconds?: number;
  confidence_threshold?: number;
  escalation_action: string;
  transfer_to_phone?: string;
  notify_staff_members?: string[];
}

export class VoiceAgentOrchestrator {
  async routeIncomingCall(params: {
    tenantId: string;
    phoneNumber: string;
    fromNumber: string;
    callControlId: string;
  }): Promise<{ agentConfig: AgentConfig; shouldAnswer: boolean; action?: string }> {
    const { data: phoneNumberData } = await supabase
      .from('telnyx_phone_numbers')
      .select('assigned_to, agent_config_id')
      .eq('tenant_id', params.tenantId)
      .eq('phone_number', params.phoneNumber)
      .maybeSingle();

    if (!phoneNumberData?.agent_config_id) {
      throw new Error('No agent configuration found for this phone number');
    }

    const { data: agentConfig } = await supabase
      .from('voice_agent_configurations')
      .select('*')
      .eq('id', phoneNumberData.agent_config_id)
      .eq('is_active', true)
      .single();

    if (!agentConfig) {
      throw new Error('Agent configuration is not active');
    }

    const isWithinBusinessHours = this.checkBusinessHours(
      agentConfig.business_hours,
      agentConfig.timezone
    );

    if (!isWithinBusinessHours) {
      return {
        agentConfig,
        shouldAnswer: false,
        action: agentConfig.after_hours_action,
      };
    }

    const currentCalls = await this.getCurrentCallCount(agentConfig.id);
    if (currentCalls >= agentConfig.max_concurrent_calls) {
      return {
        agentConfig,
        shouldAnswer: false,
        action: 'queue',
      };
    }

    return {
      agentConfig,
      shouldAnswer: true,
    };
  }

  private checkBusinessHours(
    businessHours: Record<string, { enabled: boolean; start: string; end: string }>,
    timezone: string
  ): boolean {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const weekday = parts.find(p => p.type === 'weekday')?.value.toLowerCase();
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

      if (!weekday || !businessHours[weekday]) {
        return false;
      }

      const daySchedule = businessHours[weekday];
      if (!daySchedule.enabled) {
        return false;
      }

      const currentMinutes = hour * 60 + minute;
      const [startHour, startMin] = daySchedule.start.split(':').map(Number);
      const [endHour, endMin] = daySchedule.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true;
    }
  }

  private async getCurrentCallCount(agentConfigId: string): Promise<number> {
    const { count } = await supabase
      .from('voice_call_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_config_id', agentConfigId)
      .in('status', ['ringing', 'answered', 'in_progress']);

    return count || 0;
  }

  async checkEscalationRules(params: {
    agentConfigId: string;
    callSessionId: string;
    utterance?: string;
    sentiment?: string;
    sentimentScore?: number;
    confidence?: number;
    durationSeconds?: number;
  }): Promise<EscalationRule | null> {
    const { data: rules } = await supabase
      .from('voice_agent_escalation_rules')
      .select('*')
      .eq('agent_config_id', params.agentConfigId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      return null;
    }

    for (const rule of rules) {
      if (this.shouldEscalate(rule, params)) {
        return rule;
      }
    }

    return null;
  }

  private shouldEscalate(
    rule: EscalationRule,
    params: {
      utterance?: string;
      sentiment?: string;
      sentimentScore?: number;
      confidence?: number;
      durationSeconds?: number;
    }
  ): boolean {
    switch (rule.trigger_type) {
      case 'keyword':
        if (rule.keywords && params.utterance) {
          return rule.keywords.some(keyword =>
            params.utterance!.toLowerCase().includes(keyword.toLowerCase())
          );
        }
        break;

      case 'sentiment':
        if (rule.sentiment_threshold !== undefined && params.sentimentScore !== undefined) {
          return params.sentimentScore < rule.sentiment_threshold;
        }
        break;

      case 'confidence_low':
        if (rule.confidence_threshold !== undefined && params.confidence !== undefined) {
          return params.confidence < rule.confidence_threshold;
        }
        break;

      case 'duration':
        if (rule.duration_threshold_seconds && params.durationSeconds) {
          return params.durationSeconds > rule.duration_threshold_seconds;
        }
        break;

      case 'customer_request':
        if (params.utterance) {
          const requestPhrases = [
            'speak to',
            'talk to',
            'transfer',
            'human',
            'person',
            'representative',
            'agent',
            'manager',
          ];
          return requestPhrases.some(phrase =>
            params.utterance!.toLowerCase().includes(phrase)
          );
        }
        break;
    }

    return false;
  }

  async executeEscalation(
    rule: EscalationRule,
    callSessionId: string,
    telnyxClient: TelnyxClient
  ): Promise<void> {
    const { data: session } = await supabase
      .from('voice_call_sessions')
      .select('call_control_id, tenant_id')
      .eq('id', callSessionId)
      .single();

    if (!session) {
      throw new Error('Call session not found');
    }

    await supabase
      .from('voice_call_sessions')
      .update({
        escalated: true,
        escalated_at: new Date().toISOString(),
        escalation_reason: rule.rule_name,
      })
      .eq('id', callSessionId);

    switch (rule.escalation_action) {
      case 'transfer_to_human':
        if (rule.transfer_to_phone) {
          await telnyxClient.speak(
            session.call_control_id,
            'Please hold while I transfer you to a team member.'
          );
          await telnyxClient.transferCall(session.call_control_id, rule.transfer_to_phone);
        }
        break;

      case 'send_alert':
        if (rule.notify_staff_members && rule.notify_staff_members.length > 0) {
          await this.notifyStaff(
            session.tenant_id,
            rule.notify_staff_members,
            callSessionId,
            rule.rule_name
          );
        }
        break;

      case 'schedule_callback':
        await telnyxClient.speak(
          session.call_control_id,
          'I will have someone call you back as soon as possible. Thank you for your patience.'
        );
        break;

      case 'offer_callback':
        await telnyxClient.speak(
          session.call_control_id,
          'Would you like us to call you back? Press 1 for yes, or press 2 to continue holding.'
        );
        await telnyxClient.gatherInput(session.call_control_id, {
          minimumDigits: 1,
          maximumDigits: 1,
          timeout: 10,
        });
        break;
    }
  }

  private async notifyStaff(
    tenantId: string,
    staffIds: string[],
    callSessionId: string,
    reason: string
  ): Promise<void> {
    console.log(`Notifying staff members about escalation: ${reason}`);
  }

  async getKnowledgeBaseContext(
    agentConfigId: string,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    const { data: articles } = await supabase
      .from('voice_agent_knowledge_base')
      .select('title, content')
      .eq('agent_config_id', agentConfigId)
      .eq('is_active', true)
      .textSearch('search_vector', query)
      .order('priority', { ascending: false })
      .limit(limit);

    if (!articles || articles.length === 0) {
      return [];
    }

    return articles.map(article => `${article.title}: ${article.content}`);
  }

  async getScript(
    agentConfigId: string,
    scriptType: string
  ): Promise<string | null> {
    const { data: script } = await supabase
      .from('voice_agent_scripts')
      .select('script_content, variables')
      .eq('agent_config_id', agentConfigId)
      .eq('script_type', scriptType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();

    return script?.script_content || null;
  }

  async updateAnalytics(params: {
    tenantId: string;
    agentConfigId: string;
    date: string;
    hour: number;
    metrics: {
      totalCalls?: number;
      inboundCalls?: number;
      outboundCalls?: number;
      answeredCalls?: number;
      missedCalls?: number;
      totalDurationSeconds?: number;
      escalatedCalls?: number;
      demosBooked?: number;
      issuesResolved?: number;
      totalCostUsd?: number;
    };
  }): Promise<void> {
    const { data: existing } = await supabase
      .from('voice_agent_analytics')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('agent_config_id', params.agentConfigId)
      .eq('date', params.date)
      .eq('hour', params.hour)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, number> = {};
      if (params.metrics.totalCalls) {
        updates.total_calls = existing.total_calls + params.metrics.totalCalls;
      }
      if (params.metrics.inboundCalls) {
        updates.inbound_calls = existing.inbound_calls + params.metrics.inboundCalls;
      }
      if (params.metrics.outboundCalls) {
        updates.outbound_calls = existing.outbound_calls + params.metrics.outboundCalls;
      }
      if (params.metrics.answeredCalls) {
        updates.answered_calls = existing.answered_calls + params.metrics.answeredCalls;
      }
      if (params.metrics.missedCalls) {
        updates.missed_calls = existing.missed_calls + params.metrics.missedCalls;
      }
      if (params.metrics.totalDurationSeconds) {
        updates.total_duration_seconds = existing.total_duration_seconds + params.metrics.totalDurationSeconds;
      }
      if (params.metrics.escalatedCalls) {
        updates.escalated_calls = existing.escalated_calls + params.metrics.escalatedCalls;
      }
      if (params.metrics.demosBooked) {
        updates.demos_booked = existing.demos_booked + params.metrics.demosBooked;
      }
      if (params.metrics.issuesResolved) {
        updates.issues_resolved = existing.issues_resolved + params.metrics.issuesResolved;
      }
      if (params.metrics.totalCostUsd) {
        updates.total_cost_usd = existing.total_cost_usd + params.metrics.totalCostUsd;
      }

      await supabase
        .from('voice_agent_analytics')
        .update(updates)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('voice_agent_analytics')
        .insert({
          tenant_id: params.tenantId,
          agent_config_id: params.agentConfigId,
          date: params.date,
          hour: params.hour,
          ...params.metrics,
        });
    }
  }
}

export const voiceAgentOrchestrator = new VoiceAgentOrchestrator();

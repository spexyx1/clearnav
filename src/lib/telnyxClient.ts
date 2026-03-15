import { supabase } from './supabase';

interface TelnyxCallControlParams {
  to: string;
  from: string;
  connectionId: string;
  webhookUrl?: string;
  answerUrl?: string;
}

interface TelnyxCallResponse {
  data: {
    call_control_id: string;
    call_session_id: string;
    call_leg_id: string;
    status: string;
  };
}

export class TelnyxClient {
  private apiKey: string;
  private baseUrl = 'https://api.telnyx.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telnyx API Error: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  async initiateCall(params: TelnyxCallControlParams): Promise<TelnyxCallResponse> {
    return this.request<TelnyxCallResponse>('/calls', 'POST', {
      to: params.to,
      from: params.from,
      connection_id: params.connectionId,
      webhook_url: params.webhookUrl,
      answer_url: params.answerUrl,
    });
  }

  async answerCall(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/answer`, 'POST');
  }

  async hangupCall(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/hangup`, 'POST');
  }

  async transferCall(callControlId: string, to: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/transfer`, 'POST', { to });
  }

  async playAudio(callControlId: string, audioUrl: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/playback_start`, 'POST', {
      audio_url: audioUrl,
    });
  }

  async speak(callControlId: string, text: string, voice: string = 'female'): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/speak`, 'POST', {
      payload: text,
      voice,
      language: 'en-US',
    });
  }

  async startRecording(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/record_start`, 'POST', {
      format: 'mp3',
      channels: 'single',
    });
  }

  async stopRecording(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/record_stop`, 'POST');
  }

  async startTranscription(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/transcription_start`, 'POST', {
      transcription_engine: 'telnyx',
      language: 'en',
    });
  }

  async stopTranscription(callControlId: string): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/transcription_stop`, 'POST');
  }

  async gatherInput(
    callControlId: string,
    params: {
      minimumDigits?: number;
      maximumDigits?: number;
      timeout?: number;
      terminatingDigit?: string;
    }
  ): Promise<void> {
    await this.request(`/calls/${callControlId}/actions/gather`, 'POST', {
      minimum_digits: params.minimumDigits || 1,
      maximum_digits: params.maximumDigits || 10,
      timeout_millis: (params.timeout || 5) * 1000,
      terminating_digit: params.terminatingDigit || '#',
    });
  }

  async searchPhoneNumbers(params: {
    countryCode?: string;
    areaCode?: string;
    numberType?: 'local' | 'toll-free' | 'national';
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.countryCode) searchParams.append('filter[country_code]', params.countryCode);
    if (params.areaCode) searchParams.append('filter[national_destination_code]', params.areaCode);
    if (params.numberType === 'toll-free') {
      searchParams.append('filter[phone_number_type]', 'toll_free');
    }
    searchParams.append('page[size]', String(params.limit || 20));

    return this.request(`/available_phone_numbers?${searchParams.toString()}`, 'GET');
  }

  async purchasePhoneNumber(phoneNumber: string, connectionId?: string) {
    return this.request('/phone_numbers', 'POST', {
      phone_number: phoneNumber,
      connection_id: connectionId,
    });
  }

  async updatePhoneNumber(phoneNumberId: string, params: {
    connectionId?: string;
    webhookUrl?: string;
  }) {
    return this.request(`/phone_numbers/${phoneNumberId}`, 'PATCH', {
      connection_id: params.connectionId,
      webhook_url: params.webhookUrl,
    });
  }

  async releasePhoneNumber(phoneNumberId: string) {
    return this.request(`/phone_numbers/${phoneNumberId}`, 'DELETE');
  }

  async getCallDetails(callControlId: string) {
    return this.request(`/calls/${callControlId}`, 'GET');
  }

  async getRecording(recordingId: string) {
    return this.request(`/recordings/${recordingId}`, 'GET');
  }
}

export async function getTelnyxClientForTenant(tenantId: string): Promise<TelnyxClient | null> {
  const { data: config } = await supabase
    .from('voice_agent_configurations')
    .select('telnyx_api_key_encrypted')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle();

  if (!config?.telnyx_api_key_encrypted) {
    return null;
  }

  return new TelnyxClient(config.telnyx_api_key_encrypted);
}

export async function createCallSession(params: {
  tenantId: string;
  agentConfigId: string;
  phoneNumberId: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  callControlId: string;
  callSessionId: string;
  callLegId: string;
}) {
  const { data, error } = await supabase
    .from('voice_call_sessions')
    .insert({
      tenant_id: params.tenantId,
      agent_config_id: params.agentConfigId,
      phone_number_id: params.phoneNumberId,
      direction: params.direction,
      from_number: params.fromNumber,
      to_number: params.toNumber,
      call_control_id: params.callControlId,
      call_session_id: params.callSessionId,
      call_leg_id: params.callLegId,
      status: 'initiated',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCallSession(
  callControlId: string,
  updates: {
    status?: string;
    ringingAt?: string;
    answeredAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    sentimentCurrent?: string;
    sentimentScore?: number;
    intentDetected?: string;
    escalated?: boolean;
    escalationReason?: string;
    callOutcome?: string;
    outcomeNotes?: string;
  }
) {
  const updateData: Record<string, unknown> = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.ringingAt) updateData.ringing_at = updates.ringingAt;
  if (updates.answeredAt) updateData.answered_at = updates.answeredAt;
  if (updates.endedAt) updateData.ended_at = updates.endedAt;
  if (updates.durationSeconds) updateData.duration_seconds = updates.durationSeconds;
  if (updates.sentimentCurrent) updateData.sentiment_current = updates.sentimentCurrent;
  if (updates.sentimentScore !== undefined) updateData.sentiment_score = updates.sentimentScore;
  if (updates.intentDetected) updateData.intent_detected = updates.intentDetected;
  if (updates.escalated !== undefined) updateData.escalated = updates.escalated;
  if (updates.escalationReason) updateData.escalation_reason = updates.escalationReason;
  if (updates.callOutcome) updateData.call_outcome = updates.callOutcome;
  if (updates.outcomeNotes) updateData.outcome_notes = updates.outcomeNotes;

  const { data, error } = await supabase
    .from('voice_call_sessions')
    .update(updateData)
    .eq('call_control_id', callControlId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addTranscriptEntry(params: {
  callSessionId: string;
  tenantId: string;
  sequenceNumber: number;
  speaker: 'agent' | 'customer' | 'system';
  utterance: string;
  timestampOffsetMs: number;
  durationMs?: number;
  intent?: string;
  sentiment?: string;
  confidence?: number;
  keywords?: string[];
}) {
  const { data, error } = await supabase
    .from('voice_call_transcripts')
    .insert({
      call_session_id: params.callSessionId,
      tenant_id: params.tenantId,
      sequence_number: params.sequenceNumber,
      speaker: params.speaker,
      utterance: params.utterance,
      timestamp_offset_ms: params.timestampOffsetMs,
      duration_ms: params.durationMs,
      intent: params.intent,
      sentiment: params.sentiment,
      confidence: params.confidence,
      keywords: params.keywords,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

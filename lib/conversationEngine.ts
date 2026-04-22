import { voiceAgentOrchestrator } from './voiceAgentOrchestrator';

interface Message {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

interface ConversationContext {
  messages: Message[];
  customerInfo?: {
    name?: string;
    company?: string;
    previousInteractions?: number;
  };
  intent?: string;
  entities?: Record<string, unknown>;
}

export class ConversationEngine {
  private context: ConversationContext;
  private agentConfigId: string;
  private maxContextMessages: number;

  constructor(agentConfigId: string, systemPrompt: string, maxContextMessages: number = 10) {
    this.agentConfigId = agentConfigId;
    this.maxContextMessages = maxContextMessages;
    this.context = {
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    };
  }

  async processUserInput(userInput: string): Promise<{
    response: string;
    intent?: string;
    sentiment?: string;
    sentimentScore?: number;
    confidence?: number;
    shouldEscalate?: boolean;
  }> {
    this.context.messages.push({
      role: 'user',
      content: userInput,
    });

    this.trimContext();

    const knowledgeContext = await voiceAgentOrchestrator.getKnowledgeBaseContext(
      this.agentConfigId,
      userInput,
      3
    );

    const sentiment = this.analyzeSentiment(userInput);
    const intent = this.detectIntent(userInput);

    let enhancedPrompt = userInput;
    if (knowledgeContext.length > 0) {
      enhancedPrompt = `Context from knowledge base:\n${knowledgeContext.join('\n\n')}\n\nUser question: ${userInput}`;
    }

    const response = await this.generateResponse(enhancedPrompt);

    this.context.messages.push({
      role: 'assistant',
      content: response,
    });

    this.context.intent = intent;

    return {
      response,
      intent,
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      confidence: 0.85,
      shouldEscalate: this.checkIfShouldEscalate(sentiment, intent, userInput),
    };
  }

  private async generateResponse(prompt: string): Promise<string> {
    const contextMessages = this.context.messages.slice(-this.maxContextMessages);

    const messagesForAI = [
      ...contextMessages.slice(0, -1),
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    return `Thank you for that information. I understand you're asking about ${prompt.slice(0, 50)}. Let me help you with that.`;
  }

  private analyzeSentiment(text: string): { sentiment: string; score: number } {
    const negativeWords = [
      'angry',
      'frustrated',
      'terrible',
      'awful',
      'horrible',
      'hate',
      'worst',
      'disappointed',
      'annoyed',
      'upset',
    ];
    const positiveWords = [
      'great',
      'excellent',
      'wonderful',
      'amazing',
      'love',
      'best',
      'happy',
      'pleased',
      'satisfied',
      'perfect',
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });

    score = Math.max(-1, Math.min(1, score));

    let sentiment = 'neutral';
    if (score < -0.3) sentiment = 'negative';
    else if (score < -0.6) sentiment = 'frustrated';
    else if (score > 0.3) sentiment = 'positive';
    else if (score > 0.6) sentiment = 'satisfied';

    return { sentiment, score };
  }

  private detectIntent(text: string): string {
    const lowerText = text.toLowerCase();

    const intentPatterns = {
      pricing: ['price', 'cost', 'pricing', 'expensive', 'cheap', 'afford', 'payment'],
      demo: ['demo', 'demonstration', 'show me', 'see it', 'trial'],
      support: ['help', 'problem', 'issue', 'not working', 'broken', 'error'],
      information: ['what is', 'how does', 'tell me about', 'explain', 'information'],
      complaint: ['complaint', 'unhappy', 'disappointed', 'cancel', 'refund'],
      purchase: ['buy', 'purchase', 'sign up', 'get started', 'order'],
    };

    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return intent;
      }
    }

    return 'general_inquiry';
  }

  private checkIfShouldEscalate(
    sentiment: { sentiment: string; score: number },
    intent: string,
    userInput: string
  ): boolean {
    if (sentiment.score < -0.5) {
      return true;
    }

    if (intent === 'complaint') {
      return true;
    }

    const escalationPhrases = [
      'speak to manager',
      'talk to human',
      'real person',
      'transfer me',
      'supervisor',
    ];

    const lowerInput = userInput.toLowerCase();
    if (escalationPhrases.some(phrase => lowerInput.includes(phrase))) {
      return true;
    }

    return false;
  }

  private trimContext(): void {
    if (this.context.messages.length > this.maxContextMessages + 1) {
      const systemMessage = this.context.messages[0];
      const recentMessages = this.context.messages.slice(-(this.maxContextMessages - 1));
      this.context.messages = [systemMessage, ...recentMessages];
    }
  }

  setCustomerInfo(info: { name?: string; company?: string; previousInteractions?: number }): void {
    this.context.customerInfo = info;

    if (info.name) {
      const greeting = `Note: The customer's name is ${info.name}. Address them personally when appropriate.`;
      this.context.messages[0].content += `\n${greeting}`;
    }
  }

  getConversationSummary(): string {
    const userMessages = this.context.messages.filter(m => m.role === 'user');
    const summary = userMessages.map(m => m.content).join(' ');
    return summary.slice(0, 200) + (summary.length > 200 ? '...' : '');
  }

  getKeyPoints(): string[] {
    const keyPoints: string[] = [];

    if (this.context.intent) {
      keyPoints.push(`Intent: ${this.context.intent}`);
    }

    if (this.context.customerInfo?.company) {
      keyPoints.push(`Company: ${this.context.customerInfo.company}`);
    }

    const userMessages = this.context.messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      keyPoints.push(`Conversation turns: ${userMessages.length}`);
    }

    return keyPoints;
  }

  async getScriptForScenario(scriptType: string): Promise<string | null> {
    return voiceAgentOrchestrator.getScript(this.agentConfigId, scriptType);
  }
}

export function createSystemPrompt(params: {
  agentName: string;
  agentType: 'sales_outbound' | 'sales_inbound' | 'support_inbound' | 'general';
  companyName?: string;
  personalityTraits?: Record<string, number>;
  greetingMessage?: string;
}): string {
  const { agentName, agentType, companyName, personalityTraits, greetingMessage } = params;

  let basePrompt = `You are ${agentName}, an AI voice assistant`;

  if (companyName) {
    basePrompt += ` for ${companyName}`;
  }

  basePrompt += '.\n\n';

  switch (agentType) {
    case 'sales_outbound':
      basePrompt += `Your role is to make outbound sales calls. Your goals are to:
- Qualify leads and identify decision makers
- Schedule product demonstrations
- Answer questions about products and pricing
- Build rapport and maintain a positive tone
- Handle objections professionally
- Move prospects through the sales funnel

Keep your responses concise and conversational. Ask open-ended questions to understand their needs.`;
      break;

    case 'sales_inbound':
      basePrompt += `Your role is to handle inbound sales inquiries. Your goals are to:
- Welcome potential customers warmly
- Understand their needs and requirements
- Provide product information and pricing
- Schedule demos or connect them with sales reps
- Capture lead information
- Create a positive first impression

Be helpful and enthusiastic. Focus on understanding their specific needs.`;
      break;

    case 'support_inbound':
      basePrompt += `Your role is to provide customer support. Your goals are to:
- Resolve customer issues efficiently
- Provide accurate product information
- Troubleshoot technical problems
- Escalate complex issues when necessary
- Maintain customer satisfaction
- Document issues for follow-up

Be patient and empathetic. Focus on resolving their issue quickly.`;
      break;

    case 'general':
      basePrompt += `Your role is to assist callers with general inquiries. Your goals are to:
- Route calls to appropriate departments
- Answer frequently asked questions
- Provide company information
- Schedule callbacks when needed
- Maintain a professional demeanor

Be helpful and efficient in directing callers to the right resources.`;
      break;
  }

  if (personalityTraits) {
    basePrompt += '\n\nPersonality guidelines:\n';
    if (personalityTraits.friendliness) {
      basePrompt += `- Friendliness level: ${personalityTraits.friendliness}/10\n`;
    }
    if (personalityTraits.formality) {
      basePrompt += `- Formality level: ${personalityTraits.formality}/10\n`;
    }
    if (personalityTraits.enthusiasm) {
      basePrompt += `- Enthusiasm level: ${personalityTraits.enthusiasm}/10\n`;
    }
  }

  if (greetingMessage) {
    basePrompt += `\n\nYour greeting: "${greetingMessage}"`;
  }

  basePrompt += '\n\nImportant: Keep responses brief and natural, as this is a voice conversation. Avoid long paragraphs.';

  return basePrompt;
}

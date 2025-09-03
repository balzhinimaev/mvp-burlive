import { Controller, Get, UseGuards } from '@nestjs/common';
import { OnboardingGuard } from '../auth/onboarding.guard';

@Controller('content')
export class ContentController {
  @Get('onboarding')
  onboarding() {
    return { 
      title: 'Welcome to English Learning!', 
      description: 'Start your 7-day English course: vocabulary, grammar, listening, and speaking practice.' 
    };
  }

  @Get('lesson1')
  @UseGuards(OnboardingGuard)
  lesson1() {
    return { 
      id: 1, 
      title: 'Hello & Greetings', 
      level: 'A1',
      skillType: 'vocabulary',
      durationMin: 8,
      content: {
        vocabulary: ['Hello', 'Hi', 'Good morning', 'Good evening', 'How are you?', 'Nice to meet you'],
        phrases: [
          { english: 'Hello, how are you?', translation: 'Привет, как дела?' },
          { english: 'Nice to meet you', translation: 'Приятно познакомиться' },
          { english: 'Good morning', translation: 'Доброе утро' }
        ]
      }
    };
  }

  @Get('paywall')
  @UseGuards(OnboardingGuard)
  paywall() {
    return {
      title: 'Unlock Full English Course',
      description: 'Get access to all lessons, exercises, and advanced features',
      products: [
        { 
          id: 'monthly', 
          name: 'Monthly Plan',
          priceRub: 99, 
          durationDays: 30,
          features: ['All lessons A1-C2', 'Speaking practice', 'Grammar exercises', 'Progress tracking']
        },
        { 
          id: 'quarterly', 
          name: 'Quarterly Plan', 
          priceRub: 249, 
          durationDays: 90,
          features: ['All lessons A1-C2', 'Speaking practice', 'Grammar exercises', 'Progress tracking', '15% discount']
        },
      ],
    };
  }
}



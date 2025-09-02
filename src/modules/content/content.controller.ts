import { Controller, Get } from '@nestjs/common';

@Controller('content')
export class ContentController {
  @Get('onboarding')
  onboarding() {
    return { title: 'Эрхит!', description: '7-дневный старт-курс: аудио, транслит, бейджи.' };
  }

  @Get('lesson1')
  lesson1() {
    return { id: 1, title: 'Сайн байна', durationMin: 6 };
  }

  @Get('paywall')
  paywall() {
    return {
      products: [
        { id: 'monthly', priceRub: 79, durationDays: 30 },
        { id: 'quarterly', priceRub: 199, durationDays: 90 },
      ],
    };
  }
}



import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GapTaskDataDto } from '../src/modules/content/dto/task-data.dto';

describe('GapTaskDataDto optional fields', () => {
  it('should validate when only required fields are present', async () => {
    const dto = plainToInstance(GapTaskDataDto, {
      text: 'Go ____ and turn right',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow optional fields when provided', async () => {
    const dto = plainToInstance(GapTaskDataDto, {
      text: 'The car arrives in ____ minutes',
      hint: 'Подсказка',
      accept: ['5','five'],
      explanation: 'Пояснение',
      context: 'Сцена',
      audioKey: 'a.b.c',
      caseInsensitive: true,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});



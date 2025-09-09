import { z } from 'zod';
import * as fs from 'fs/promises';

const TaskBase = z.object({
  ref: z.string().regex(/^[a-z0-9.]+\.t\d+$/),
  type: z.enum(['choice','gap','listen','order','speak','translate']),
  data: z.unknown()
});
const Lesson = z.object({
  lessonRef: z.string().regex(/^[a-z0-9.]+\.\d{3}$/),
  moduleRef: z.string(),
  tasks: z.array(TaskBase)
});

(async () => {
  const raw = await fs.readFile('seeds/content.json','utf8');
  const content = JSON.parse(raw);
  const seen = new Set<string>();
  for (const l of content.lessons ?? []) {
    const parsed = Lesson.parse(l);
    if (seen.has(parsed.lessonRef)) throw new Error(`Duplicate lessonRef: ${parsed.lessonRef}`);
    seen.add(parsed.lessonRef);
    for (const t of parsed.tasks) {
      // базовая защита: не должно быть ключей-ответов в экспортируемом JSON
      const str = JSON.stringify(t.data);
      if (/\b(isCorrect|correct(Index|Indexes)?|answer(s)?|expected(Answers)?|solution(s)?)\b/.test(str))
        throw new Error(`Answers leak in ${t.ref}`);
    }
  }
  console.log('Content OK');
})();

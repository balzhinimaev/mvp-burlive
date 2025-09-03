import { TaskDto } from '../dto/task.dto';

export function lintLessonTasks(lessonRef: string, tasks?: TaskDto[]): string[] {
  const errors: string[] = [];
  if (!tasks || tasks.length === 0) return errors;
  const seen = new Set<string>();
  tasks.forEach((t, i) => {
    if (seen.has(t.ref)) errors.push(`duplicate task.ref: ${t.ref}`);
    seen.add(t.ref);
    if (!t.ref.startsWith(`${lessonRef}.`)) errors.push(`task[${i}].ref must start with ${lessonRef}.`);
    if (t.type === 'choice') {
      const d = t.data as any;
      if (!Array.isArray(d.options) || d.options.length < 2) errors.push(`choice[${i}] requires >=2 options`);
      if (typeof d.correctIndex !== 'number') errors.push(`choice[${i}] missing correctIndex`);
    }
    if (t.type === 'gap') {
      const d = t.data as any;
      if (typeof d.text !== 'string' || !d.text.includes('____')) errors.push(`gap[${i}].text must contain ____`);
      if (typeof d.answer !== 'string' || !d.answer) errors.push(`gap[${i}].answer is required`);
    }
  });
  return errors;
}



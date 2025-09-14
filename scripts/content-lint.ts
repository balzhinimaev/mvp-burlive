import * as fs from 'fs/promises';
import * as path from 'path';

type GapTask = { ref: string; type: string; data: any };
type LessonLike = { lessonRef?: string; tasks?: GapTask[] };

const NUMBER_WORD_TO_DIGIT: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
};

export interface LintSummary {
  filesScanned: number;
  gapsFound: number;
  gapsWithHintAndExplanation: number;
  repackedToChoice: number;
  issues: string[];
}

async function readJson(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  let dirents: Array<{ name: string; isDirectory: () => boolean } & any> = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true }) as any;
  } catch {
    return;
  }
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* walk(res);
    } else if (dirent.name.endsWith('.json')) {
      yield res;
    }
  }
}

export async function runContentLint(rootDirs: string[] = ['seeds', path.join('content','seeds')]): Promise<LintSummary> {
  const summary: LintSummary = {
    filesScanned: 0,
    gapsFound: 0,
    gapsWithHintAndExplanation: 0,
    repackedToChoice: 0,
    issues: [],
  };

  const jsonFiles: string[] = [];
  for (const root of rootDirs) {
    for await (const file of walk(root)) jsonFiles.push(file);
  }

  for (const file of jsonFiles) {
    summary.filesScanned++;
    const data = await readJson(file);
    if (!data) continue;

    const lessons: LessonLike[] = Array.isArray(data?.lessons) ? data.lessons : [];
    for (const lesson of lessons) {
      const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
      for (const task of tasks) {
        if (task?.type !== 'gap') continue;
        summary.gapsFound++;
        const d = task.data || {};

        const hasHint = typeof d.hint === 'string' && d.hint.trim().length > 0;
        const hasExplanation = typeof d.explanation === 'string' && d.explanation.trim().length > 0;
        if (hasHint && hasExplanation) summary.gapsWithHintAndExplanation++;

        if (!hasHint || !hasExplanation) {
          summary.issues.push(`${file} :: ${task.ref} — missing ${!hasHint ? 'hint' : ''}${!hasHint && !hasExplanation ? ' & ' : ''}${!hasExplanation ? 'explanation' : ''}`);
        }

        // Numbers 1–20: if answer is a number word, ensure accept includes the digit
        const answer: string | undefined = typeof d.answer === 'string' ? d.answer : undefined;
        if (answer) {
          const key = answer.toLowerCase().trim();
          const digit = NUMBER_WORD_TO_DIGIT[key];
          if (digit) {
            const accept: string[] = Array.isArray(d.accept) ? d.accept : [];
            const hasDigit = accept.some(a => (a ?? '').toString().trim() === digit);
            if (!hasDigit) {
              summary.issues.push(`${file} :: ${task.ref} — numeric accept missing for "${answer}" -> ${digit}`);
            }
          }
        }
      }
    }
  }

  return summary;
}

(async () => {
  const summary = await runContentLint();
  const improved = summary.gapsWithHintAndExplanation;
  const repacked = summary.repackedToChoice;

  if (summary.issues.length) {
    console.error(`content:lint FAILED`);
    console.error(`Files scanned: ${summary.filesScanned}`);
    console.error(`GAP found: ${summary.gapsFound}`);
    console.error(`Improved (hint+explanation): ${improved}`);
    console.error(`Repacked to choice: ${repacked}`);
    for (const issue of summary.issues) console.error(` - ${issue}`);
    process.exit(1);
  } else {
    console.log(`content:lint OK`);
    console.log(`Files scanned: ${summary.filesScanned}`);
    console.log(`GAP found: ${summary.gapsFound}`);
    console.log(`Improved (hint+explanation): ${improved}`);
    console.log(`Repacked to choice: ${repacked}`);
  }
})();



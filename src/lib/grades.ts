interface DbTask {
  type: string;
  practiceNumber: number | null;
  grade: number | null;
}

export interface GradeSummary {
  practicesAverage: number; // 0-100
  midtermsAverage: number; // 0-100
  finalExamGrade: number; // 0-100
  practicesScore: number; // weighted (out of 35)
  midtermsScore: number; // weighted (out of 35)
  finalExamScore: number; // weighted (out of 30)
  finalScore: number; // total (0-100)
  isApproved: boolean;
  notesNeededForPassing: {
    finalExamNeeded: number | null; // Note needed in final exam to pass
    impossibleToPass: boolean;
    alreadyPassed: boolean;
  };
}

export function calculateCourseGrades(
  practicesCount: number, // N
  courseTasks: DbTask[]
): GradeSummary {
  // 1. Practices calculations
  const practiceTasks = courseTasks.filter((t) => t.type === "practice");
  const totalPracticesSum = practiceTasks.reduce((sum, task) => {
    return sum + (task.grade || 0);
  }, 0);

  // Divide by configured N (classical system)
  const practicesAverage = practicesCount > 0 ? totalPracticesSum / practicesCount : 0;
  const practicesScore = practicesAverage * 0.35;

  // 2. Midterms calculations (exam_1, exam_2)
  const exam1 = courseTasks.find((t) => t.type === "exam_1")?.grade ?? 0;
  const exam2 = courseTasks.find((t) => t.type === "exam_2")?.grade ?? 0;

  const midtermsAverage = (exam1 + exam2) / 2;
  const midtermsScore = midtermsAverage * 0.35; // Each is 17.5%

  // 3. Final exam calculations (exam_final)
  const finalExamGrade = courseTasks.find((t) => t.type === "exam_final")?.grade ?? 0;
  const finalExamScore = finalExamGrade * 0.3;

  // 4. Final Score (total out of 100)
  const finalScore = practicesScore + midtermsScore + finalExamScore;
  const isApproved = finalScore >= 51;

  // 5. Simulator logic (Calculate what final exam note is needed to pass - reach 51)
  // 51 = practicesScore + midtermsScore + (finalExamNeeded * 0.30)
  // finalExamNeeded * 0.30 = 51 - practicesScore - midtermsScore
  // finalExamNeeded = (51 - practicesScore - midtermsScore) / 0.30
  const currentAccumulated = practicesScore + midtermsScore;
  let finalExamNeeded: number | null = null;
  let impossibleToPass = false;
  let alreadyPassed = currentAccumulated >= 51;

  if (!alreadyPassed) {
    const rawNeeded = (51 - currentAccumulated) / 0.3;
    if (rawNeeded > 100) {
      impossibleToPass = true;
      finalExamNeeded = null;
    } else {
      finalExamNeeded = Math.max(0, Math.ceil(rawNeeded * 100) / 100); // round up to 2 decimals
    }
  }

  return {
    practicesAverage: Math.round(practicesAverage * 100) / 100,
    midtermsAverage: Math.round(midtermsAverage * 100) / 100,
    finalExamGrade: Math.round(finalExamGrade * 100) / 100,
    practicesScore: Math.round(practicesScore * 100) / 100,
    midtermsScore: Math.round(midtermsScore * 100) / 100,
    finalExamScore: Math.round(finalExamScore * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
    isApproved,
    notesNeededForPassing: {
      finalExamNeeded,
      impossibleToPass,
      alreadyPassed,
    },
  };
}

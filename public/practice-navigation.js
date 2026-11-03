export function nextPracticeExercise(exercises, currentId) {
  const current = exercises.find(exercise => exercise.id === currentId);
  if (!current) return null;
  const sameType = exercises.filter(exercise => (exercise.type === 'mcq') === (current.type === 'mcq'));
  const topic = sameType.filter(exercise => exercise.skill === current.skill);
  const pool = topic.length > 1 ? topic : sameType;
  const index = pool.findIndex(exercise => exercise.id === currentId);
  return pool.length > 1 ? pool[(index + 1) % pool.length] : null;
}

export function showPracticeNavigation(root) {
  const navigation = root.querySelector('[data-practice-navigation]');
  if (navigation) navigation.hidden = false;
}

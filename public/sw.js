importScripts('/math-assets.js');
const CACHE = 'math-lab-v74-portal-login';
const REPORT_ASSETS=['/self-study.js','/assessment-summary.js'];
const ASSETS = [...self.MATH_ASSETS, '/math-assets.js', '/math.js', '/math.css', '/formula-library.js', '/formula-curriculum.js', '/formula-atlas.js', '/formula-atlas.css', '/explore-view.js', '/explore-lab.js', '/explore-scene.js', '/explore-3d.css', '/formula-details.js', '/formula-geometry.js', '/vendor/three/three.module.js', '/vendor/three/three.core.js', '/vendor/three/CSS3DRenderer.js', '/', '/index.html', '/style.css', '/reference.css', '/fonts.css', '/assets/fonts/noto-sans-400.ttf', '/assets/fonts/noto-sans-500.ttf', '/assets/fonts/noto-sans-600.ttf', '/assets/fonts/noto-sans-700.ttf', '/ui.js', '/app.js', '/bootstrap.js', '/learning-stats.js', '/auth-client.js', '/auth.css', '/data.js', '/grade-content.js', '/demo-lessons.js', '/lesson-library.js', '/lesson-upload.js', '/content-editor.js', '/learning-view.js', '/learning-core.js', '/teacher-dashboard.js', '/teacher-dashboard.css', '/parent-dashboard.js', '/parent-dashboard.css', '/assets/child-portrait.svg', '/assets/teacher.svg', '/assets/student.svg', '/assets/family.svg', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];
ASSETS.push('/exam-builder.js','/repair-leaderboard.js','/roster-import.js','/teacher-tools.css','/teacher-workspace.js','/teacher-library-view.js','/teacher-exam.js');
ASSETS.push('/parent-mail.js','/school-theme.css','/assets/logo-truong.jpg','/assets/school-campus.webp','/assets/school-campus-mobile.webp');
ASSETS.push('/app-shell.js','/app-shell.css',...REPORT_ASSETS);
ASSETS.push('/usage-tracker.js','/pwa.js','/pwa.css','/icon-maskable-512.png','/apple-touch-icon.png');
ASSETS.push('/account-maintenance.js','/explore-core.js','/discovery-data.js','/discovery-lab.js');
ASSETS.push('/timed-exams.js','/timed-exams.css','/exam-author.js','/exam-builder.css','/class-assessments.js','/class-assessments.css','/essay-images.js','/essay-images.css');
ASSETS.push('/knowledge-view.js','/essay-view.js');
ASSETS.push('/archived-history.js','/tutor-attachments.js','/tutor-view.js','/tutor.css');
ASSETS.push('/datatm-view.js','/datatm.css');
ASSETS.push('/discovery-scene.js','/practice-photos.js','/practice-choices.js','/practice-mcq-bank.js');
ASSETS.push('/question-library-view.js','/question-library.css');
ASSETS.push('/math-format.js','/school-identity.css');
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.filter(asset=>!asset.startsWith('/vendor/three/'))))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('math-lab-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok && ASSETS.includes(url.pathname)) { const clone = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, clone))); } return response; }).catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? caches.match('/') : Response.error())));
});

ASSETS.push('/student-analytics.js','/student-report.js','/student-report.css');

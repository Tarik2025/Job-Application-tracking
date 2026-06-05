// Manual analysis engine - works without any AI service

// ===== SKILL TAXONOMY =====
const SKILL_DB = {
  languages: ['javascript','typescript','python','java','c','c++','csharp','go','rust','ruby','php','swift','kotlin','scala','r','dart','perl','shell','bash','sql','html','css'],
  frontend: ['react','nextjs','angular','vue','svelte','jquery','redux','zustand','tailwind','bootstrap','sass','less','webpack','vite','storybook','figma'],
  backend: ['node','express','nestjs','django','flask','fastapi','spring','springboot','rails','laravel','gin','fiber','actix','dotnet','graphql','rest','grpc','websocket'],
  database: ['mysql','postgres','postgresql','mongodb','redis','elasticsearch','dynamodb','firebase','supabase','sqlite','oracle','cassandra','neo4j'],
  cloud: ['aws','azure','gcp','heroku','vercel','netlify','digitalocean','cloudflare','lambda','ec2','s3','ecs','eks'],
  devops: ['docker','kubernetes','jenkins','github actions','gitlab ci','terraform','ansible','nginx','apache','linux','ci/cd','prometheus','grafana','datadog'],
  mobile: ['react native','flutter','swift','kotlin','android','ios','expo','capacitor'],
  ai_ml: ['tensorflow','pytorch','scikit-learn','pandas','numpy','opencv','nlp','deep learning','machine learning','neural network','huggingface','langchain','llm'],
  tools: ['git','github','gitlab','bitbucket','jira','confluence','notion','slack','postman','swagger','vim','vscode'],
  concepts: ['microservices','monolith','event driven','cqrs','ddd','tdd','bdd','solid','design patterns','oop','functional','agile','scrum','kanban','devops','sre'],
};

const ALL_SKILLS = Object.values(SKILL_DB).flat();

// ===== RESUME ANALYSIS =====

export function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,;|/()[\]{}]+/).map(w => w.replace(/[^a-z0-9#+.]/g, ''));
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) bigrams.push(`${words[i]} ${words[i+1]}`);

  const found = new Set();
  for (const skill of ALL_SKILLS) {
    if (skill.includes(' ')) {
      if (bigrams.some(b => b === skill) || lower.includes(skill)) found.add(skill);
    } else {
      if (words.includes(skill)) found.add(skill);
    }
  }

  // Handle aliases
  const aliases = { 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'k8s': 'kubernetes', 'pg': 'postgres', 'mongo': 'mongodb', 'tf': 'terraform', 'rn': 'react native', 'node.js': 'node', 'react.js': 'react', 'vue.js': 'vue', 'next.js': 'nextjs', 'express.js': 'express' };
  for (const [alias, real] of Object.entries(aliases)) {
    if (words.includes(alias) || lower.includes(alias)) found.add(real);
  }

  return [...found];
}

export function extractExperience(text) {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i,
    /experience\s*:?\s*(\d+)\+?\s*(?:years?|yrs?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

export function extractEducation(text) {
  const degrees = [];
  const degreePatterns = [
    /\b(B\.?Tech|B\.?E\.?|B\.?Sc|BCA|BBA)\b/gi,
    /\b(M\.?Tech|M\.?E\.?|M\.?Sc|MCA|MBA|PhD|Ph\.?D)\b/gi,
    /\b(Bachelor|Master|Doctorate)\b/gi,
  ];
  for (const p of degreePatterns) {
    const matches = text.match(p);
    if (matches) degrees.push(...matches);
  }
  return [...new Set(degrees.map(d => d.trim()))];
}

export function extractContact(text) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phone = text.match(/(?:\+91|0)?[\s-]?[6-9]\d{4}[\s-]?\d{5}/);
  const linkedin = text.match(/linkedin\.com\/in\/[\w-]+/);
  const github = text.match(/github\.com\/[\w-]+/);
  return { email: email?.[0], phone: phone?.[0], linkedin: linkedin?.[0], github: github?.[0] };
}

export function analyzeResume(text) {
  return {
    skills: extractSkillsFromText(text),
    experience_years: extractExperience(text),
    education: extractEducation(text),
    contact: extractContact(text),
    word_count: text.split(/\s+/).length,
    has_projects: /projects?/i.test(text),
    has_certifications: /certif/i.test(text),
  };
}

// ===== RESUME vs JD MATCHING =====

export function matchManual(resumeText, jobDescription) {
  const resumeSkills = extractSkillsFromText(resumeText);
  const jdSkills = extractSkillsFromText(jobDescription);

  if (jdSkills.length === 0) {
    return { match_score: 50, matching_skills: resumeSkills.slice(0, 10), missing_skills: [], suggestions: ['Job description has no clear technical requirements to match against'], summary: 'Unable to determine match — JD lacks specific skills' };
  }

  const matching = jdSkills.filter(s => resumeSkills.includes(s));
  const missing = jdSkills.filter(s => !resumeSkills.includes(s));

  // Weighted scoring
  let score = Math.round((matching.length / jdSkills.length) * 80); // Max 80 from skills

  // Bonus points
  const resumeExp = extractExperience(resumeText);
  const jdExp = extractExperience(jobDescription);
  if (resumeExp && jdExp && resumeExp >= jdExp) score += 10;
  if (extractEducation(resumeText).length > 0) score += 5;
  if (/projects?/i.test(resumeText)) score += 5;

  score = Math.min(score, 100);

  // Smart suggestions
  const suggestions = [];
  if (missing.length > 0) suggestions.push(`Add these to your resume: ${missing.slice(0, 5).join(', ')}`);
  if (missing.length > 3) suggestions.push('Consider taking a course for the missing skills');
  if (!resumeExp) suggestions.push('Add years of experience explicitly');
  if (resumeText.split(/\s+/).length < 200) suggestions.push('Resume seems short — add more details to projects');
  if (score >= 70) suggestions.push('Strong match! Focus on tailoring project descriptions');

  // Categorize skills
  const categoryMatch = {};
  for (const [cat, skills] of Object.entries(SKILL_DB)) {
    const jdInCat = jdSkills.filter(s => skills.includes(s));
    const matchInCat = matching.filter(s => skills.includes(s));
    if (jdInCat.length > 0) categoryMatch[cat] = { required: jdInCat.length, matched: matchInCat.length };
  }

  return {
    match_score: score,
    matching_skills: matching,
    missing_skills: missing,
    suggestions,
    summary: `${score}% match. ${matching.length}/${jdSkills.length} required skills found.${resumeExp ? ` ${resumeExp} yrs experience.` : ''}`,
    category_breakdown: categoryMatch
  };
}

// ===== EMAIL CLASSIFICATION =====

const EMAIL_PATTERNS = {
  offer: {
    keywords: ['offer letter', 'pleased to offer', 'congratulations', 'selected for the position', 'compensation', 'joining date', 'onboarding', 'welcome aboard', 'ctc', 'salary breakup'],
    weight: 1.0
  },
  interview_invitation: {
    keywords: ['interview', 'schedule', 'round', 'availability', 'slot', 'technical discussion', 'HR discussion', 'coding test', 'assessment', 'hackerrank', 'codility', 'zoom link', 'teams meeting', 'panel interview'],
    weight: 0.9
  },
  rejection: {
    keywords: ['regret to inform', 'unfortunately', 'not moving forward', 'decided to go with', 'other candidates', 'not shortlisted', 'wish you all the best', 'will not be proceeding', 'position has been filled'],
    weight: 0.95
  },
  application_received: {
    keywords: ['received your application', 'thank you for applying', 'application submitted', 'successfully applied', 'under review', 'reviewing your profile', 'received your resume', 'application is currently in queue', 'in queue', 'will contact you if', 'if you are shortlisted', 'thank you for your application', 'thank you for your interest'],
    weight: 0.85
  },
  follow_up: {
    keywords: ['follow up', 'following up', 'checking in', 'any update', 'status update', 'wanted to check', 'gentle reminder', 'next steps'],
    weight: 0.7
  },
};

export function classifyManual(body, subject = '') {
  const text = `${subject} ${body}`.toLowerCase();
  let bestType = 'other', bestScore = 0, bestMatches = [];

  for (const [type, { keywords, weight }] of Object.entries(EMAIL_PATTERNS)) {
    const matches = keywords.filter(kw => text.includes(kw));
    const score = matches.length * weight;
    if (score > bestScore) {
      bestType = type; bestScore = score; bestMatches = matches;
    }
  }

  const confidence = Math.min(0.4 + bestScore * 0.2, 0.95);

  // Extract company
  let company = null;
  const companyPatterns = [
    /(?:interest in|considering|applying to|application (?:to|for|at))\s+(?:the\s+)?([A-Z][A-Za-z]+)/,
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+(?:Recruitment|HR|Hiring|Talent|Team|Careers|Apprenticeship|Program)/,
    /(?:at|from|with|to)\s+([A-Z][A-Za-z\s&.]{2,25})(?:\.|\s+(?:is|has|we|team|pvt|ltd|inc))/,
    /(?:team at|hiring at|position at|application to|interest in joining)\s+([A-Z][A-Za-z\s&.]{2,25})/,
    /(?:interest in joining)\s+(?:our|the)?\s*(?:team at)?\s*([A-Z][A-Za-z]+)/,
    /(?:the\s+)?([A-Z][A-Za-z]+)\s+(?:Careers?|Jobs?)\s+(?:webpage|page|site|portal)/,
  ];
  for (const p of companyPatterns) {
    const m = `${subject} ${body}`.match(p);
    if (m) { company = m[1].trim().replace(/\s+(is|has|we)$/i, ''); break; }
  }

  // Extract role
  let role = null;
  const rolePatterns = [
    /(?:application for|applied for|interest in)\s+(?:the\s+)?([A-Za-z\s/()\-]+?)(?:\.|,|\n|We|will|and)/i,
    /(?:for|position|role|opening|job)\s*(?:of|for|:|-)\s*([A-Za-z\s/()\-]+?)(?:\.|,|\n|We|will)/i,
    /(?:Intern|Internship|Apprentice|Apprenticeship)\s*[-–:]?\s*([A-Za-z\s/()]+?)(?:\.|,|\n|We|will)/i,
    /((?:Intern|Senior|Junior|Lead|Staff|Principal)?\s*[-–]?\s*(?:Software|Frontend|Backend|Full[- ]?Stack|Data|DevOps|Cloud|Mobile|ML|AI|QA|Product|Developer|Marketing|Design|HR|Sales|Business|Technical|Research)\s*(?:Engineer|Developer|Analyst|Scientist|Manager|Designer|Architect|Relations|Evangelist|Advocate|Intern)?)/i,
    /([A-Za-z]+\s+(?:Apprenticeship|Fellowship|Residency)\s*(?:Program)?)/i,
    /(?:position|role|opening|job)\s*(?:of|for|:|-)\s*([A-Za-z\s/()]+?)(?:\.|,|\n|at)/i,
  ];
  for (const p of rolePatterns) {
    const m = `${subject} ${body}`.match(p);
    if (m) { role = m[1].trim().slice(0, 60); break; }
  }

  // Extract date
  let date = null;
  const dateMatch = `${subject} ${body}`.match(/\d{1,2}[\s/-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s/-]\d{2,4}/i);
  if (dateMatch) date = dateMatch[0];

  const statusMap = { interview_invitation: 'interview', offer: 'offer', rejection: 'rejected', application_received: 'applied', follow_up: 'under_review' };

  return {
    classification: bestType,
    company,
    role,
    date,
    suggested_status: statusMap[bestType] || 'applied',
    summary: `${bestType.replace(/_/g, ' ')}${company ? ` from ${company}` : ''}${role ? ` for ${role}` : ''}`,
    confidence,
    matched_keywords: bestMatches
  };
}

// ===== INTERVIEW PREP =====

const ROLE_QUESTIONS = {
  'frontend': [
    { question: 'Explain the virtual DOM and how React uses it.', type: 'technical', difficulty: 'medium', tip: 'Compare with real DOM, mention reconciliation' },
    { question: 'How do you optimize a slow React application?', type: 'technical', difficulty: 'hard', tip: 'Mention memoization, code splitting, lazy loading, profiler' },
    { question: 'Explain CSS specificity and the box model.', type: 'technical', difficulty: 'easy', tip: 'Inline > ID > Class > Element, content+padding+border+margin' },
    { question: 'How do you handle state management in large apps?', type: 'technical', difficulty: 'medium', tip: 'Context, Redux, Zustand — tradeoffs of each' },
  ],
  'backend': [
    { question: 'Explain REST vs GraphQL — when to use which?', type: 'technical', difficulty: 'medium', tip: 'REST for simple CRUD, GraphQL for complex nested data' },
    { question: 'How do you design a rate limiter?', type: 'technical', difficulty: 'hard', tip: 'Token bucket or sliding window, Redis-based' },
    { question: 'Explain database indexing and when it hurts.', type: 'technical', difficulty: 'medium', tip: 'B-tree, hurts on frequent writes, choose columns wisely' },
    { question: 'How do you handle authentication and authorization?', type: 'technical', difficulty: 'medium', tip: 'JWT vs sessions, RBAC, OAuth 2.0' },
  ],
  'fullstack': [
    { question: 'Walk me through deploying a full-stack app.', type: 'technical', difficulty: 'medium', tip: 'CI/CD, Docker, cloud hosting, env management' },
    { question: 'How do you handle API versioning?', type: 'technical', difficulty: 'medium', tip: 'URL versioning, header versioning, backward compatibility' },
  ],
  'data': [
    { question: 'Explain the bias-variance tradeoff.', type: 'technical', difficulty: 'hard', tip: 'Underfitting vs overfitting, regularization' },
    { question: 'How do you handle missing data in a dataset?', type: 'technical', difficulty: 'medium', tip: 'Imputation, deletion, model-based methods' },
  ],
  'devops': [
    { question: 'Explain container orchestration with Kubernetes.', type: 'technical', difficulty: 'hard', tip: 'Pods, services, deployments, scaling' },
    { question: 'How do you implement CI/CD for a microservices app?', type: 'technical', difficulty: 'medium', tip: 'Pipeline per service, automated testing, blue-green deployment' },
  ],
};

const COMMON_QUESTIONS = [
  { question: 'Tell me about yourself.', type: 'behavioral', difficulty: 'easy', tip: 'Present-past-future format, 2 minutes max' },
  { question: 'Why are you leaving your current role?', type: 'behavioral', difficulty: 'medium', tip: 'Stay positive, focus on growth not complaints' },
  { question: 'Describe a time you disagreed with a teammate.', type: 'behavioral', difficulty: 'medium', tip: 'Show resolution skills, compromise, outcome' },
  { question: 'How do you prioritize when everything is urgent?', type: 'behavioral', difficulty: 'medium', tip: 'Eisenhower matrix, communicate with stakeholders' },
  { question: 'Tell me about a time you failed.', type: 'behavioral', difficulty: 'medium', tip: 'Show learning, what you changed after' },
  { question: 'Where do you see yourself in 3-5 years?', type: 'behavioral', difficulty: 'easy', tip: 'Growth in current domain, leadership aspirations' },
];

export function prepManual(role, company) {
  const roleLower = role.toLowerCase();
  let roleSpecific = [];

  if (roleLower.includes('front')) roleSpecific = ROLE_QUESTIONS.frontend || [];
  else if (roleLower.includes('back')) roleSpecific = ROLE_QUESTIONS.backend || [];
  else if (roleLower.includes('full') || roleLower.includes('mern') || roleLower.includes('mean')) roleSpecific = [...(ROLE_QUESTIONS.fullstack || []), ...(ROLE_QUESTIONS.frontend || []).slice(0, 2)];
  else if (roleLower.includes('data') || roleLower.includes('ml') || roleLower.includes('ai')) roleSpecific = ROLE_QUESTIONS.data || [];
  else if (roleLower.includes('devops') || roleLower.includes('sre') || roleLower.includes('cloud')) roleSpecific = ROLE_QUESTIONS.devops || [];
  else roleSpecific = ROLE_QUESTIONS.backend || [];

  const questions = [
    { question: `Why ${company}?`, type: 'behavioral', difficulty: 'easy', tip: `Research ${company} mission, products, culture` },
    { question: `What makes you a strong fit for ${role}?`, type: 'behavioral', difficulty: 'medium', tip: 'Map your top 3 skills directly to the role requirements' },
    ...roleSpecific,
    ...COMMON_QUESTIONS.slice(0, 10 - roleSpecific.length - 2),
  ];

  const topics = [...new Set([
    role.includes('Front') ? 'React/JS Fundamentals' : 'System Design',
    'Data Structures & Algorithms',
    'Company Research',
    'Behavioral (STAR Method)',
    'Problem Solving',
    role,
  ])];

  return {
    questions: questions.slice(0, 10),
    topics,
    preparation_plan: [
      { day: 1, focus: 'Company Deep Dive', tasks: [`Study ${company} products`, 'Read Glassdoor reviews', 'Understand tech stack', 'Note recent news'] },
      { day: 2, focus: 'Technical Fundamentals', tasks: ['Revise core concepts', 'Solve 3-5 DSA problems', `Practice ${role}-specific topics`] },
      { day: 3, focus: 'Behavioral Preparation', tasks: ['Write 5 STAR stories', 'Practice with a friend', 'Record and review'] },
      { day: 4, focus: 'Mock & System Design', tasks: ['Full mock interview', 'Design a system relevant to company', 'Review weak areas'] },
      { day: 5, focus: 'Final Preparation', tasks: ['Light revision only', 'Prepare questions to ask', 'Test setup (camera, mic)', 'Sleep well'] },
    ],
    company_insights: `Research ${company} on Glassdoor for interview patterns. Check LinkedIn for employee backgrounds. Understand their tech blog if available.`
  };
}

// ===== STATUS PREDICTION =====

export function predictManual(app, days) {
  const status = app.status;

  // If already in interview/offer, different logic
  if (status === 'interview') {
    if (days <= 5) return { prediction: 'active', confidence: 0.8, reasoning: 'Post-interview, decision usually takes 3-7 days.', suggested_action: 'Wait for result. Send thank-you email if not sent.', follow_up_template: `Thank you for the interview for ${app.role}. I enjoyed our conversation and remain very interested.` };
    if (days <= 14) return { prediction: 'cold', confidence: 0.6, reasoning: 'Over a week post-interview without update.', suggested_action: 'Send a polite follow-up asking for timeline.', follow_up_template: `Hi, I wanted to follow up on my interview for ${app.role} at ${app.company}. Could you share the expected timeline for next steps?` };
    return { prediction: 'likely_rejected', confidence: 0.75, reasoning: '2+ weeks post-interview with no update is usually a silent rejection.', suggested_action: 'Send one final follow-up, then move on.', follow_up_template: `Hi, checking in one last time regarding ${app.role} at ${app.company}. Would appreciate any update on the decision.` };
  }

  if (status === 'offer') return { prediction: 'active', confidence: 0.95, reasoning: 'You have an offer!', suggested_action: 'Review, negotiate if needed, and respond within deadline.', follow_up_template: '' };

  // Applied / under_review
  if (days <= 5) return { prediction: 'active', confidence: 0.8, reasoning: 'Very early — most companies take 1-2 weeks to screen.', suggested_action: 'No action needed. Keep applying elsewhere.', follow_up_template: '' };
  if (days <= 14) return { prediction: 'active', confidence: 0.6, reasoning: `${days} days is still within normal processing time.`, suggested_action: 'Wait a few more days before following up.', follow_up_template: '' };
  if (days <= 28) return { prediction: 'cold', confidence: 0.65, reasoning: `${days} days without response. Application may be in backlog.`, suggested_action: 'Send a professional follow-up email.', follow_up_template: `Hi, I applied for ${app.role} at ${app.company} ${days} days ago. I remain very interested and would love to know if there are any updates on my application status.` };
  return { prediction: 'likely_rejected', confidence: 0.75, reasoning: `${days} days with no contact. Most companies respond within 3 weeks if interested.`, suggested_action: 'Likely a silent rejection. Send a final check and move forward.', follow_up_template: `Hi, I wanted to check one final time on my application for ${app.role} at ${app.company}. If the position is filled, I understand — would appreciate knowing for closure.` };
}

// ===== FOLLOW-UP GENERATOR =====

export function followUpManual(app) {
  const days = Math.floor((Date.now() - new Date(app.applied_date).getTime()) / 86400000);
  const isPostInterview = app.status === 'interview';

  if (isPostInterview) {
    return {
      subject: `Thank you — ${app.role} Interview at ${app.company}`,
      body: `Dear Hiring Team,\n\nThank you for taking the time to interview me for the ${app.role} position. I enjoyed learning more about the team and the work at ${app.company}.\n\nOur conversation reinforced my enthusiasm for this role, and I believe my skills would be a strong fit. I'm happy to provide any additional information you might need.\n\nLooking forward to hearing about next steps.\n\nBest regards`,
      tone: 'professional'
    };
  }

  return {
    subject: `Following up — ${app.role} Application at ${app.company}`,
    body: `Dear Hiring Team,\n\nI hope this message finds you well. I submitted my application for the ${app.role} position at ${app.company}${days > 0 ? ` approximately ${days} days ago` : ' recently'}.\n\nI remain very enthusiastic about this opportunity and would love to discuss how my experience aligns with your needs. Could you kindly share any updates on the status of my application?\n\nThank you for your time and consideration.\n\nBest regards`,
    tone: 'professional'
  };
}

// ===== ANALYTICS HELPERS =====

export function calculateInsights(applications) {
  const total = applications.length;
  if (total === 0) return { total: 0, responseRate: 0, avgResponseDays: 0, topPlatform: null, bestDay: null };

  const responded = applications.filter(a => ['interview', 'offer', 'rejected'].includes(a.status));
  const responseRate = Math.round((responded.length / total) * 100);

  // Average days to response
  const responseDays = responded.map(a => Math.floor((new Date(a.last_updated) - new Date(a.applied_date)) / 86400000)).filter(d => d >= 0);
  const avgResponseDays = responseDays.length > 0 ? Math.round(responseDays.reduce((s, d) => s + d, 0) / responseDays.length) : 0;

  // Best platform
  const platforms = {};
  applications.forEach(a => { if (a.platform) platforms[a.platform] = (platforms[a.platform] || 0) + 1; });
  const topPlatform = Object.entries(platforms).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Best day to apply (which weekday gets most responses)
  const dayResponses = {};
  responded.forEach(a => {
    const day = new Date(a.applied_date).toLocaleDateString('en', { weekday: 'long' });
    dayResponses[day] = (dayResponses[day] || 0) + 1;
  });
  const bestDay = Object.entries(dayResponses).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { total, responseRate, avgResponseDays, topPlatform, bestDay };
}

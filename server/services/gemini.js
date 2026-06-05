import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { classifyManual, matchManual, prepManual, predictManual, followUpManual, analyzeResume } from './manual.js';
dotenv.config();

let model = null;
try {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
} catch { model = null; }

async function askAI(prompt) {
  if (!model) return null;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function classifyEmail(body, subject = '') {
  const ai = await askAI(`Classify this job-related email. Extract ALL details carefully. ONLY output valid JSON.

Rules:
- If the email says "application is in queue" or "currently being reviewed" or "we will contact you if shortlisted", classification MUST be "application_received" and suggested_status MUST be "applied"
- If the email mentions an interview invite, classification is "interview_invitation" and suggested_status is "interview"
- If the email says "unfortunately" or "we regret" or "not moving forward", classification is "rejection" and suggested_status is "rejected"
- If the email mentions an offer or compensation, classification is "offer" and suggested_status is "offer"
- Extract the EXACT role/position mentioned in the email for the "role" field. Do NOT leave it null if mentioned.
- Extract the company name from the sender or email body.

Subject: ${subject}
Body: ${body.slice(0, 3000)}

Respond ONLY with this JSON:
{"classification":"application_received|interview_invitation|rejection|offer|follow_up|other","company":"","role":"","suggested_status":"applied|under_review|interview|offer|rejected","summary":"","confidence":0.0}`);
  return ai || classifyManual(body, subject);
}

export async function matchResume(resumeText, jobDescription) {
  const ai = await askAI(`Compare resume vs JD. ONLY valid JSON.\nRESUME: ${resumeText.slice(0, 4000)}\nJOB: ${jobDescription.slice(0, 3000)}\n{"match_score":0,"matching_skills":[],"missing_skills":[],"suggestions":[],"summary":""}`);
  return ai || matchManual(resumeText, jobDescription);
}

export async function generateInterviewPrep(role, company, jd = '') {
  const ai = await askAI(`Interview prep. ONLY valid JSON.\nRole: ${role}, Company: ${company}${jd ? `, JD: ${jd.slice(0, 2000)}` : ''}\n{"questions":[{"question":"","type":"technical|behavioral","difficulty":"easy|medium|hard","tip":""}],"topics":[],"preparation_plan":[{"day":1,"focus":"","tasks":[]}],"company_insights":""}\n10 questions, 6 topics, 5-day plan.`);
  return ai || prepManual(role, company);
}

export async function predictStatus(app, days) {
  const ai = await askAI(`Predict status. ONLY valid JSON.\nCompany: ${app.company}, Role: ${app.role}, Status: ${app.status}, Days: ${days}\n{"prediction":"active|cold|likely_rejected","confidence":0.0,"reasoning":"","suggested_action":"","follow_up_template":""}`);
  return ai || predictManual(app, days);
}

export async function generateFollowUp(app) {
  const ai = await askAI(`Follow-up email. ONLY valid JSON.\nCompany: ${app.company}, Role: ${app.role}, Status: ${app.status}, Applied: ${app.applied_date}\n{"subject":"","body":"","tone":"professional"}`);
  return ai || followUpManual(app);
}

export { analyzeResume } from './manual.js';

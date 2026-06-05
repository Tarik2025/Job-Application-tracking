// Content script - extracts job data from supported sites
function extractJobData() {
  const url = window.location.href;
  let data = { job_url: url, platform: '', company: '', role: '', job_description: '', location: '' };

  if (url.includes('linkedin.com')) {
    data.platform = 'LinkedIn';
    data.role = document.querySelector('.job-details-jobs-unified-top-card__job-title, .top-card-layout__title')?.textContent?.trim() || '';
    data.company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link')?.textContent?.trim() || '';
    data.location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.textContent?.trim() || '';
    data.job_description = document.querySelector('.jobs-description__content, .description__text')?.textContent?.trim() || '';
  } else if (url.includes('naukri.com')) {
    data.platform = 'Naukri';
    data.role = document.querySelector('.jd-header-title, h1.jd-header-title')?.textContent?.trim() || '';
    data.company = document.querySelector('.jd-header-comp-name a, .company-name')?.textContent?.trim() || '';
    data.location = document.querySelector('.location, .loc')?.textContent?.trim() || '';
    data.job_description = document.querySelector('.job-desc, .dang-inner-html')?.textContent?.trim() || '';
  } else if (url.includes('glassdoor.com') || url.includes('glassdoor.co.in')) {
    data.platform = 'Glassdoor';
    data.role = document.querySelector('[data-test="jobTitle"], .css-1vg6q84')?.textContent?.trim() || '';
    data.company = document.querySelector('[data-test="employerName"], .css-87uc0g')?.textContent?.trim() || '';
    data.location = document.querySelector('[data-test="location"], .css-56kyx5')?.textContent?.trim() || '';
    data.job_description = document.querySelector('.jobDescriptionContent, [data-test="jobDescriptionContent"]')?.textContent?.trim() || '';
  } else if (url.includes('indeed.com')) {
    data.platform = 'Indeed';
    data.role = document.querySelector('.jobsearch-JobInfoHeader-title, h1')?.textContent?.trim() || '';
    data.company = document.querySelector('[data-testid="inlineHeader-companyName"], .css-1saizt3')?.textContent?.trim() || '';
    data.location = document.querySelector('[data-testid="inlineHeader-companyLocation"], .css-6z8o9s')?.textContent?.trim() || '';
    data.job_description = document.querySelector('#jobDescriptionText, .jobsearch-JobComponent-description')?.textContent?.trim() || '';
  }

  return data;
}

// Send data to popup when requested
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extract') sendResponse(extractJobData());
});

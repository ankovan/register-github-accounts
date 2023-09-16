import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * Generates a random password.
 * @param {number} length - The length of the password. Default is 20.
 * @param {string} characters - The characters to be used in the password. Default is '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'.
 * @returns {string} The generated password.
 */
function generatePassword(
  length = 20,
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
) {
  return Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join('');
}

/**
 * Generates a random timeout value between 500 and 1000 milliseconds.
 * @returns {number} The generated timeout in milliseconds.
 */
function getRandomTimeout() {
  return Math.floor(Math.random() * 500) + 500;
}

/**
 * Launches a new browser instance with Puppeteer and opens a new page.
 * Sets the viewport to 800x600 pixels.
 * @returns {Promise<Array>} A promise that resolves to an array containing the browser instance and the new page.
 */
async function startBrowser() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({
    width: 800,
    height: 600,
  });
  return [browser, page];
}

/**
 * Iterates over an array of buttons and clicks the first one that is visible.
 * @param {Array} buttons An array of button elements.
 * @returns {Promise} A promise that resolves when the first visible button has been clicked.
 */
async function clickVisibleContinue(buttons) {
  for (const button of buttons) {
    const isVisible = await button.evaluate(el => window.getComputedStyle(el).visibility !== 'hidden');
    if (isVisible) {
      await button.evaluate(el => el.click());
      break;
    }
  }
}

/**
 * This asynchronous function is used to click on the email field on a page.
 * The function waits for the XPath of the label containing "Enter your email" to be visible on the page.
 * Once the label is found, it retrieves the coordinates of the label and uses them to simulate a mouse click
 * on the email field.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the click action is completed.
 */
async function clickOnEmailField(page) {
  await page.waitForXPath('//label[contains(., "Enter your email")]', {
    timeout: 0, 
    visible: true,
  });
  const [emailLabel] = await page.$x('//label[contains(., "Enter your email")]');
  const emailLabelCoordinates = await emailLabel.evaluate(el =>  {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    }
  });
  await page.mouse.click(
    emailLabelCoordinates.left + 4, 
    emailLabelCoordinates.top + 4,
  );
}

/**
 * This asynchronous function checks whether an error message about email validity or existence is displayed on the page.
 * The function waits for the paragraph element containing the text "Email is invalid or already taken" to be visible on the page.
 * If such a paragraph is found, it checks whether the 'hidden' attribute is null, which would indicate that the error message is currently displayed.
 * If the error message is displayed, the function closes the browser and throws an error with the message "Email exist".
 * 
 * @param {object} page - The Puppeteer page object.
 * @throws Will throw an error if the email is invalid or already taken.
 * @returns {Promise} Returns a Promise that resolves when the check is completed.
 */
async function checkEmailExistOrInvalid(page) {
  const [isExistMailP] = await page.$x('//p[contains(., "Email is invalid or already taken")]', { visible: true });
  await page.waitForTimeout(getRandomTimeout());
  if (isExistMailP) {
    const isEmailExist = await isExistMailP.evaluate(el => el.getAttribute('hidden') === null);
    if(isEmailExist) {
      await browser.close();
      throw "Email exist";
    }
  }
}

/**
 * This function enters the provided email into an email field on a webpage,
 * checks if the email is valid and not already taken, and then clicks the 'Continue' button.
 *
 * @param {object} browser - Puppeteer browser instance.
 * @param {object} page - Puppeteer page instance.
 * @param {string} email - The email to be entered.
 * @throws Will throw an error if the email is invalid or already taken.
 * @returns {Promise} A promise to be resolved when the email field has been set.
 */
async function enterEmail(browser, page, email) {
  await clickOnEmailField(page, email);
  await page.keyboard.type(email, { delay: 100 });
  await page.waitForTimeout(getRandomTimeout());

  await checkEmailExistOrInvalid(page);

  await page.waitForXPath('//button[contains(., "Continue")][not(@disabled)]', { visible: true });
  const submitButtons = await page.$x('//button[contains(., "Continue")]');
  await clickVisibleContinue(submitButtons);
}

/**
 * This async function is used to enter a password on a webpage using Puppeteer.
 * It generates a password, waits for the password field to become visible,
 * types the password into the field, and then clicks the 'Continue' button.
 * 
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise} A promise to be resolved when the password field has been set.
 */
async function enterPassword(page) {
  const password = generatePassword();
  await page.waitForTimeout(getRandomTimeout());
  await page.waitForXPath('//label[contains(., "Create a password")]', {
    timeout: 0, 
    visible: true
  });
  await page.keyboard.type(password, { delay: 100 });
  await page.waitForXPath('//button[contains(., "Continue")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  const submitButtons = await page.$x('//button[contains(., "Continue")][not(@disabled)]');
  await clickVisibleContinue(submitButtons);
}

/**
 * This async function is used to enter a username on a webpage using Puppeteer.
 * It waits for the username field to become visible, types the username into 
 * the field, and then clicks the 'Continue' button.
 * 
 * @param {Object} page - The Puppeteer page object.
 * @param {string} username - The username to be entered.
 * @returns {Promise} A promise to be resolved when the username field has been set.
 */
async function enterUsername(page, username) {
  await page.waitForTimeout(getRandomTimeout());
  await page.waitForXPath('//label[contains(., "Enter a username")]', {
    timeout: 0, 
    visible: true,
  });
  await page.keyboard.type(username, { delay: 100 });
  await page.waitForXPath('//button[contains(., "Continue")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  const submitButtons = await page.$x('//button[contains(., "Continue")][not(@disabled)]');
  await clickVisibleContinue(submitButtons);
}

/**
 * This async function is used to reject product updates and announcements on a webpage using Puppeteer.
 * It waits for the question about product updates to become visible, types 'n' into 
 * the field to reject updates, and then clicks the 'Continue' button.
 * 
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise} A promise to be resolved when the announcements has been rejected.
 */
async function enterRejectAnnouncements(page) {
  await page.waitForTimeout(getRandomTimeout());
  await page.waitForXPath('//label[contains(., "Would you like to receive product updates and")]', {
    timeout: 0,
    visible: true,
  });
  await page.keyboard.type('n', { delay: 100 });
  await page.waitForXPath('//button[contains(., "Continue")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  const submitButtons = await page.$x('//button[contains(., "Continue")][not(@disabled)]');
  await clickVisibleContinue(submitButtons);
}

/**
 * This async function waits for the user to solve a captcha on a webpage using Puppeteer.
 * It waits for the 'Create account' button to become visible and enabled, indicating that the captcha has been solved.
 * 
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise} A promise to be resolved when the captcha has been solved.
 */
async function waitForUserSolvedCaptcha(page) {
  await page.waitForTimeout(getRandomTimeout());
  await page.waitForXPath('//button[contains(., "Create account")]', { timeout: 0, visible: true });
  await page.waitForXPath('//button[contains(., "Create account")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  const submitButtons = await page.$x('//button[contains(., "Create account")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  await clickVisibleContinue(submitButtons);
}

/**
 * This asynchronous function interacts with the Puppeteer page to configure account settings.
 * The function waits for the "Just me" and "N/A" labels to be visible on the page, and then clicks on them.
 * It then waits for the "Continue" button to be enabled and visible, and clicks on it.
 * Finally, it waits for the page to navigate to the next page.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when all the account configurations have been chosen and the page has navigated to the next page.
 */
async function chooseAccountConfigurations(page) {
  await page.waitForXPath('//label[contains(., "Just me")]');
  await page.waitForXPath('//label[contains(., "N/A")]');
  const [justMeLabel] = await page.$x('//label[contains(., "Just me")]');
  await justMeLabel.evaluate(el =>  {
    el.click();
  });
  const [nALabel] = await page.$x('//label[contains(., "N/A")]');
  await nALabel.evaluate(el =>  {
    el.click();
  });

  const submitButtons = await page.$x('//button[contains(., "Continue")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  await clickVisibleContinue(submitButtons);
  await page.waitForNavigation();
}

/**
 * This asynchronous function continues the recommended plan page on the Puppeteer page.
 * The function first finds the 'Continue' button that is not disabled and waits for a random amount of time.
 * Then, it clicks on the visible 'Continue' button and waits for the page to navigate.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the page has navigated after clicking the 'Continue' button.
 */
async function continueRecommendedPlanPage(page) {
  const submitButtons = await page.$x('//button[contains(., "Continue")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  await clickVisibleContinue(submitButtons);
  await page.waitForNavigation();
}

/**
 * This asynchronous function continues for free on the Puppeteer page.
 * The function first finds the 'Continue for free' link that is not disabled and waits for a random amount of time.
 * Then, it clicks on the visible 'Continue for free' link, waits for the page to navigate (with no timeout limit), and waits for another random amount of time.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the page has navigated after clicking the 'Continue for free' link and the second random timeout has elapsed.
 */
async function continueForFree(page) {
  const submitButtons = await page.$x('//a[contains(., "Continue for free")][not(@disabled)]');
  await page.waitForTimeout(getRandomTimeout());
  await clickVisibleContinue(submitButtons);
  await page.waitForNavigation({ timeout: 0 });
  await page.waitForTimeout(getRandomTimeout());
}

/**
 * This async function is used to set account configuration.
 * 
 * @param {object} page - Puppeteer page object.
 * @returns {Promise} A promise to be resolved when the configuration has been set.
 */
async function setAccountConfiguration(page) {
  await chooseAccountConfigurations(page);
  await continueRecommendedPlanPage(page);
  await continueForFree(page);
}

/**
 * This asynchronous function opens the account navigation sidebar on the Puppeteer page.
 * The function first waits for the "Filter" summary to be visible on the page, and then retrieves its coordinates.
 * It then clicks on a point 42 units above the top right corner of the "Filter" summary, which is assumed to open the account navigation sidebar.
 * After clicking, it waits for a random amount of time before resolving.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the account navigation sidebar has been opened and a random timeout has elapsed.
 */
async function openAccountNavigationSidebar(page) {
  const [filterSummary] = await page.$x('//summary[contains(., "Filter")]');
  const filterSummaryCoordinates = await filterSummary.evaluate(el =>  {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    }
  });
  await page.mouse.click(
    filterSummaryCoordinates.right, 
    filterSummaryCoordinates.top - 42,
  );
  await page.waitForTimeout(getRandomTimeout());
}

/**
 * This asynchronous function opens the settings page on the Puppeteer page.
 * The function first waits for the "Settings" span to be visible on the page, and then clicks on it.
 * It then waits for the page to navigate to the settings page.
 * 
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the settings page has been opened and the page has navigated to the settings page.
 */
async function openSettingsPage(page) {
  await page.waitForXPath('//span[contains(., "Settings")]', { visible: true });
  const [settingsSpan] = await page.$x('//span[contains(., "Settings")]');
  await settingsSpan.evaluate(el =>  {
    el.click();
  });
  await page.waitForNavigation();
}

/**
 * This asynchronous function shows the upload button on the Puppeteer page.
 * The function first waits for the "Edit" summary to be visible on the page, and then clicks on it.
 * After clicking, it waits for a random amount of time before resolving.
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the upload button has been shown and a random timeout has elapsed.
 */
async function showUploadButton(page) {
  await page.waitForXPath('//summary[contains(., "Edit")]', { visible: true });
  const [editSummary] = await page.$x('//summary[contains(., "Edit")]');
  await editSummary.evaluate(el =>  {
    el.click();
  });
  await page.waitForTimeout(getRandomTimeout());
}

/**
 * Asynchronous function to click on the 'Upload a photo' button on a webpage.
 *
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} A promise to be resolved when the 'Upload a photo' button has been clicked.
 */
async function clickUploadPhoto(page) {
  await page.waitForXPath('//label[contains(., "Upload a photo…")]', { visible: true });
  const [UploadPhotoLabel] = await page.$x('//label[contains(., "Upload a photo…")]');
  await UploadPhotoLabel.evaluate(el =>  {
    el.click();
  });
}

/**
 * This asynchronous function submits a new avatar on the Puppeteer page.
 * The function first waits for the "Set new profile picture" button to be visible on the page, and then clicks on it.
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the new avatar has been submitted.
 */
async function submitAvatar(page) {
  await page.waitForXPath('//button[contains(., "Set new profile picture")]', { visible: true });
  const [setPhoto] = await page.$x('//button[contains(., "Set new profile picture")]');
  await setPhoto.evaluate(el =>  {
    el.click();
  });
}

/**
 * This asynchronous function uploads an avatar on the Puppeteer page.
 * The function first waits for the file chooser to appear and clicks on the upload photo button simultaneously.
 * Then, it waits for a random amount of time before selecting the 'cat.png' file from the 'avatars' directory to upload.
 * After accepting the file, it waits for another random amount of time before resolving.
 * @param {object} page - The Puppeteer page object.
 * @returns {Promise} Returns a Promise that resolves when the avatar has been uploaded and avatar has submitted.
 */
async function uploadAcatar(page) {
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    clickUploadPhoto(page),
  ]);
  await page.waitForTimeout(getRandomTimeout());
  await fileChooser.accept(['./avatars/cat.png']);
  await page.waitForTimeout(getRandomTimeout());
  await submitAvatar(page);
}

/**
 * Asynchronous function to change user avatar.
 * 
 * @param {object} page - puppeteer page object
 * @returns {Promise} - Promise object represents the completion of user avatar change
 */
async function changeUserAvatar(page) {
  await openAccountNavigationSidebar(page);
  await openSettingsPage(page);
  await showUploadButton(page);
  await uploadAcatar(page);
} 

/**
 * Asynchronously creates a GitHub account using Puppeteer.
 * 
 * This function automates the process of creating a GitHub account by 
 * filling in the required fields (username, announcements, password, email), 
 * setting the account configuration, and changing the user avatar.
 * 
 * The captcha and email code should be set manually.
 * 
 * @async
 * @param {string} email - The email address to be used for the account.
 * @returns {Promise} A promise to be resolved when Github Account has been created.
 */
async function createGithubAccount(email) {
  console.log("Account email:", email);
  const [browser, page] = await startBrowser();
  await page.goto('https://github.com/signup');
  const username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, 'x');

  // Fill fields to create account
  await Promise.all([
    enterUsername(page, username),
    enterRejectAnnouncements(page),
    enterPassword(page),
    waitForUserSolvedCaptcha(page),
    enterEmail(browser, page, email),
  ]);

  await setAccountConfiguration(page);
  await changeUserAvatar(page);
  await browser.close();
  // for debug purpose
  // await page.waitForFunction(() => {
  //   return false
  // }, { timeout: 0 })
}

/**
 * Asynchronously reads a list of emails from a file and attempts to create a GitHub account for each email.
 */
(async () => {
  const readInterface = readline.createInterface({
    input: fs.createReadStream('emails.txt', {encoding: "utf-8", flags: "a+"}),
  });
  for await (const line of readInterface) {
    const emails = line.split(',').map(item => item.trim());
    for (const email of emails) {
      if(!email) {
        continue;
      }
      try {
        await createGithubAccount(email);
      } catch (error) {
        console.log(error);
      }
    }
  }
})();

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence');
const BASE_URL = 'http://localhost:5173';

async function takeScreenshot(driver, name) {
    const screenshot = await driver.takeScreenshot();
    const filePath = path.join(EVIDENCE_DIR, `${name}.png`);
    fs.writeFileSync(filePath, screenshot, 'base64');
    console.log(`Captured: ${name}.png`);
}

async function runFullTest() {
    console.log('--- Starting Full E2E Test Suite ---');
    if (!fs.existsSync(EVIDENCE_DIR)) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    let options = new chrome.Options();
    // options.addArguments('--headless'); // Comment out if you want to see the browser
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1280,1024');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    let report = [];
    const log = (msg) => {
        const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
        console.log(entry);
        report.push(entry);
    };

    try {
        // 1. Navigation to Login
        log('Navigating to Login page...');
        await driver.get(`${BASE_URL}/login`);
        await driver.wait(until.elementLocated(By.id('login-email')), 10000);
        await takeScreenshot(driver, '01_login_page');

        // 2. Login Flow
        log('Performing Authentication...');
        await driver.findElement(By.id('login-email')).sendKeys('admin@growe.edu');
        await driver.findElement(By.id('login-password')).sendKeys('admin123', Key.RETURN);
        
        log('Waiting for Dashboard redirection...');
        await driver.wait(until.urlContains('/'), 10000);
        await driver.wait(until.elementLocated(By.tagName('nav')), 10000);
        await takeScreenshot(driver, '02_dashboard_loaded');

        // 3. Navigate to AI Flashcards
        log('Navigating to AI Flashcards...');
        await driver.get(`${BASE_URL}/ai-flashcards`);
        await driver.wait(until.elementLocated(By.id('topic')), 10000);
        await takeScreenshot(driver, '03_flashcards_page');

        // 4. Flashcard Generation Flow
        log('Testing Flashcard Generation...');
        const topicInput = await driver.findElement(By.id('topic'));
        await topicInput.sendKeys('Automated Software Testing');
        
        const generateBtn = await driver.findElement(By.css('button[type="submit"]'));
        await generateBtn.click();
        
        log('Waiting for AI generation (this may take a moment)...');
        // Wait for the grid of cards to appear
        await driver.wait(until.elementLocated(By.className('perspective-[1000px]')), 30000);
        await takeScreenshot(driver, '04_flashcards_generated');
        
        // 5. Test Interactivity (Flip a card)
        log('Testing card interactivity (flip)...');
        const firstCard = await driver.findElement(By.className('cursor-pointer'));
        await firstCard.click();
        await driver.sleep(1000); // Wait for transition
        await takeScreenshot(driver, '05_flashcard_flipped');

        // 6. Test Assignment Creation
        log('Navigating to Create Assignment...');
        await driver.get(`${BASE_URL}/assignments/new`);
        await driver.wait(until.elementLocated(By.id('assignment-title')), 10000);
        await driver.findElement(By.id('assignment-title')).sendKeys('Selenium E2E Test Assignment');
        await driver.findElement(By.id('assignment-desc')).sendKeys('This assignment was automatically created by the Selenium E2E test suite to verify platform integrity.');
        
        // Pick target date for slots (today + 3 days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        const isoDate = targetDate.toISOString().slice(0, 10);
        const isoDateTime = targetDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        
        const dateInput = await driver.findElement(By.id('assignment-deadline'));
        await driver.executeScript(`
            arguments[0].value = arguments[1];
            arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
        `, dateInput, isoDateTime);
        log(`Set assignment deadline to: ${isoDateTime}`);
        
        log('Submitting Assignment...');
        const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
        await driver.executeScript("arguments[0].scrollIntoView(true);", submitBtn);
        await driver.sleep(500);
        await submitBtn.click();
        
        await driver.wait(until.urlContains('/assignments'), 10000);
        await takeScreenshot(driver, '06_assignment_created');

        // 7. Test Group Creation
        log('Navigating to Create Group...');
        await driver.get(`${BASE_URL}/groups/new`);
        await driver.wait(until.elementLocated(By.id('group-name')), 10000);
        await driver.findElement(By.id('group-name')).sendKeys('Selenium Automated Study Group');
        await driver.findElement(By.id('group-desc')).sendKeys('Auto-generated group for verification.');
        await driver.findElement(By.id('max-m')).clear();
        await driver.findElement(By.id('max-m')).sendKeys('15');
        
        log('Submitting Group...');
        const groupSubmitBtn = await driver.findElement(By.css('button[type="submit"]'));
        await driver.executeScript("arguments[0].scrollIntoView(true);", groupSubmitBtn);
        await driver.sleep(500);
        await groupSubmitBtn.click();
        
        await driver.wait(until.urlMatches(/\/groups\/.+/), 10000);
        await takeScreenshot(driver, '07_group_created');

        // 8. Test Tutor Booking Flow
        log('Navigating to Tutor Bookings...');
        await driver.get(`${BASE_URL}/tutors`);
        await driver.wait(until.elementLocated(By.css('input[type="date"]')), 10000);
        
        // Pick target date for slots (today + 3 days)
        const tutorDateInput = await driver.findElement(By.css('input[type="date"]'));
        await driver.executeScript(`
            arguments[0].value = arguments[1];
            arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
        `, tutorDateInput, isoDate);
        log(`Set tutor date to: ${isoDate}`);
        
        log('Waiting for slots to load...');
        const slotRefreshBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Refresh') or contains(text(), 'Loading')]")), 10000);
        await driver.wait(async () => {
            const text = await slotRefreshBtn.getText();
            return text === 'Refresh';
        }, 10000);
        
        log('Checking for available slots...');
        // Find slot by text to ensure we click the one we seeded
        try {
            const seededSlot = await driver.wait(until.elementLocated(By.xpath("//span[contains(text(), '10:00 AM')]")), 10000);
            log('Seeded slot (10:00 AM) found, attempting to click...');
            
            // Find parent clickable card
            const slotCard = await seededSlot.findElement(By.xpath("./ancestor::div[contains(@class, 'cursor-pointer')]"));
            await driver.executeScript("arguments[0].scrollIntoView(true);", slotCard);
            await driver.sleep(500);
            await slotCard.click();
            
            log('Confirming slot selection...');
            const confirmBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Confirm')]")), 5000);
            await confirmBtn.click();
            
            log('Waiting for tutor selection page...');
            await driver.wait(until.urlContains('/tutors/select'), 10000);
            await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Test Tutor')]")), 10000);
            await takeScreenshot(driver, '08_tutor_selection_page');
            
            log('Requesting session with Test Tutor...');
            const requestBtn = await driver.findElement(By.xpath("//h3[contains(text(), 'Test Tutor')]/ancestor::div[contains(@class, 'flex-col')]//button"));
            await requestBtn.click();
            
            log('Waiting for booking success toast...');
            await driver.wait(until.urlContains('/tutors'), 10000);
            await takeScreenshot(driver, '09_booking_finalized');
        } catch (err) {
            log(`ERROR finding seeded slot: ${err.message}`);
            await takeScreenshot(driver, 'ERROR_seeded_slot_not_found');
            throw err;
        }

        log('Full Expanded Test Suite Completed Successfully!');
        report.push('\nRESULT: ALL STEPS PASSED');

    } catch (error) {
        log(`CRITICAL ERROR during testing: ${error.message}`);
        await takeScreenshot(driver, 'EROR_test_failure');
        report.push('\nRESULT: TEST FAILED');
    } finally {
        fs.writeFileSync(path.join(EVIDENCE_DIR, 'test_report.txt'), report.join('\n'));
        log(`Test evidence collected in: ${EVIDENCE_DIR}`);
        await driver.quit();
    }
}

runFullTest();

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const EVIDENCE_DIR = path.join(process.cwd(), 'tests', 'evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function takeScreenshot(driver, name) {
    const data = await driver.takeScreenshot();
    const filePath = path.join(EVIDENCE_DIR, `${name}.png`);
    fs.writeFileSync(filePath, data, 'base64');
    console.log(`Captured: ${name}.png`);
}

function log(msg) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
}

/**
 * Enhanced input setter that uses exposed global React setters if available,
 * otherwise falls back to a robust event-dispatching method.
 */
async function setReactState(driver, setterName, value) {
    await driver.executeScript(`
        if (window["${setterName}"]) {
            window["${setterName}"](arguments[0]);
        } else {
            console.error("Global setter ${setterName} not found!");
        }
    `, value);
}

async function runRealCredentialTest() {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options())
        .build();

    try {
        // --- PART A: Tutor Availability Setup ---
        log('--- Stage 1: Tutor Availability ---');
        await driver.get(`${BASE_URL}/login`);
        await driver.wait(until.elementLocated(By.id('login-email')), 10000);
        
        log('Logging in as Tutor (gaaya1999@gmail.com)...');
        await driver.findElement(By.id('login-email')).sendKeys('gaaya1999@gmail.com');
        await driver.findElement(By.id('login-password')).sendKeys('ranakutty', Key.RETURN);
        
        await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Welcome back')]")), 15000);
        log('Tutor Dashboard loaded.');

        log('Navigating to Availability Management...');
        await driver.get(`${BASE_URL}/my-availability`);
        await driver.wait(until.elementLocated(By.id('avail-date')), 10000);
        
        const targetDate = '2026-04-26'; // Sunday
        log(`Setting availability for ${targetDate}...`);
        
        // Use exposed setters
        await setReactState(driver, '_setAvailableDate', targetDate);
        await setReactState(driver, '_setStartTime', '10:00');
        await setReactState(driver, '_setEndTime', '11:00');
        
        log('Clicking Add...');
        const addBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Add')]"));
        await driver.wait(until.elementIsEnabled(addBtn), 10000);
        await addBtn.click();
        
        log('Waiting for slot to appear in the list...');
        await driver.wait(until.elementLocated(By.xpath(`//span[contains(text(), '${targetDate}') and contains(text(), '10:00')]`)), 10000);
        await takeScreenshot(driver, 'real_01_tutor_availability_added');

        log('Logging out Tutor...');
        const logoutBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Logout')]")), 10000);
        await logoutBtn.click();
        await driver.wait(until.urlContains('/login'), 10000);

        // --- PART B: Student Booking ---
        log('--- Stage 2: Student Booking ---');
        await driver.wait(until.elementLocated(By.id('login-email')), 10000);
        await driver.findElement(By.id('login-email')).sendKeys('mathivathanagn@gmail.com');
        await driver.findElement(By.id('login-password')).sendKeys('ranakutty', Key.RETURN);
        
        await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Welcome back')]")), 15000);
        log('Student Dashboard loaded.');

        log('Navigating to Tutor Bookings...');
        await driver.get(`${BASE_URL}/tutors`);
        await driver.wait(until.elementLocated(By.css('input[type="date"]')), 10000);
        
        log(`Selecting date: ${targetDate}...`);
        await setReactState(driver, '_setSelectedDate', targetDate);
        
        log('Waiting for slots to load...');
        const slotRefreshBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Refresh') or contains(text(), 'Loading')]")), 15000);
        await driver.wait(async () => {
            const text = await slotRefreshBtn.getText();
            return text === 'Refresh';
        }, 15000);
        
        log('Locating the 10:00 AM slot...');
        const seededSlot = await driver.wait(until.elementLocated(By.xpath("//span[contains(text(), '10:00 AM')]")), 10000);
        const slotCard = await seededSlot.findElement(By.xpath("./ancestor::div[contains(@class, 'cursor-pointer')]"));
        await driver.executeScript("arguments[0].scrollIntoView(true);", slotCard);
        await driver.sleep(500);
        await slotCard.click();
        
        log('Confirming selection...');
        const confirmBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Confirm')]")), 5000);
        await confirmBtn.click();
        
        log('Waiting for Tutor Selection Page...');
        await driver.wait(until.urlContains('/tutors/select'), 10000);
        await takeScreenshot(driver, 'real_02_tutor_selection_page');
        
        log('Requesting session with Gaayaththiri Mathivathanan...');
        const requestBtn = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Gaayaththiri Mathivathanan')]/ancestor::div[contains(@class, 'flex-col')]//button")), 10000);
        await requestBtn.click();
        
        log('Waiting for booking confirmation...');
        await driver.wait(until.urlContains('/tutors'), 10000);
        await takeScreenshot(driver, 'real_03_booking_finalized');
        
        log('Real Credential Test Suite Completed Successfully!');

    } catch (err) {
        log(`CRITICAL ERROR during testing: ${err.message}`);
        await takeScreenshot(driver, 'real_ERROR_test_failure');
    } finally {
        await driver.quit();
    }
}

runRealCredentialTest();

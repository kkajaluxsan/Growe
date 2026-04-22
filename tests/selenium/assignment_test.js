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

async function setReactState(driver, setterName, value) {
    await driver.executeScript(`
        if (window["${setterName}"]) {
            window["${setterName}"](arguments[0]);
        } else {
            console.error("Global setter ${setterName} not found!");
        }
    `, value);
}

async function runAssignmentTest() {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options())
        .build();

    try {
        log('--- Stage 1: Login ---');
        await driver.get(`${BASE_URL}/login`);
        await driver.wait(until.elementLocated(By.id('login-email')), 10000);
        
        log('Logging in as Student (mathivathanagn@gmail.com)...');
        await driver.findElement(By.id('login-email')).sendKeys('mathivathanagn@gmail.com');
        await driver.findElement(By.id('login-password')).sendKeys('ranakutty', Key.RETURN);
        
        await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Welcome back')]")), 15000);
        log('Student Dashboard loaded.');

        log('Navigating to Assignment Creation...');
        await driver.get(`${BASE_URL}/assignments/new`);
        await driver.wait(until.elementLocated(By.id('assignment-title')), 10000);
        
        const title = "E2E Test Assignment " + new Date().getTime();
        const deadline = "2026-04-30T14:00";
        
        log(`Filling assignment details: ${title}...`);
        await setReactState(driver, '_setAssignmentTitle', title);
        await setReactState(driver, '_setAssignmentDesc', "Automated testing of assignment creation flow with valid deadline.");
        await setReactState(driver, '_setAssignmentDeadline', deadline);
        
        await driver.sleep(1000); // Wait for state sync
        await takeScreenshot(driver, 'assignment_01_form_filled');
        
        log('Clicking Create Assignment...');
        const createBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Create assignment')]"));
        await createBtn.click();
        
        log('Waiting for redirect to assignment list...');
        await driver.wait(until.urlContains('/assignments'), 10000);
        
        log('Verifying new assignment in the list...');
        await driver.wait(until.elementLocated(By.xpath(`//h3[contains(text(), '${title}')]`)), 10000);
        await takeScreenshot(driver, 'assignment_02_created_successfully');
        
        log('Assignment Test Completed Successfully!');

    } catch (err) {
        log(`CRITICAL ERROR during testing: ${err.message}`);
        await takeScreenshot(driver, 'assignment_ERROR_failure');
    } finally {
        await driver.quit();
    }
}

runAssignmentTest();

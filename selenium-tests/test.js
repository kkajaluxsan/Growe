const { Builder, By } = require('selenium-webdriver');

async function testProject() {

let driver = await new Builder().forBrowser('chrome').build();

try {

await driver.get('http://localhost:3000');

console.log("Project opened successfully");

await driver.sleep(5000);

} finally {

await driver.quit();

}

}

testProject();
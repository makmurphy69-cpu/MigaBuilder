/* One scenario per tool: the narration (each h.step sentence is spoken and
 * shown as a caption) and the actions performed on the real page while it plays.
 * See record.mjs for the helper API (h.click, h.type, h.skip, h.sample*, …). */
export const SCENARIOS = {};
const S = (file, def) => { SCENARIOS[file] = def; };

S('bug-scanner.html', {
  title: 'Bug Scanner', subtitle: 'Find, explain and fix bugs in any code',
  intro: 'Welcome to Bug Scanner. In one minute you will see how to find the bugs in your code, understand why they happen, and get the fixed version.',
  async run(h, page) {
    await h.step('Paste your code into the box, open files, or drop a whole project as a zip file. For this example, we load a small shopping list web page that has a few hidden bugs.', () => h.click('#exampleWeb'));
    await h.step('Choose the language, or leave it on auto detect. Then press Scan code.', () => h.click('#scanBtn'));
    await h.skip('Skipping ahead while the AI reviews the code', () => page.waitForSelector('#progressText:has-text("complete"), #progressText:has-text("problems")', { timeout: 180000 }));
    await h.step('Here are the results. The score shows the overall quality, and every problem is listed from most to least serious.', () => h.point('#score'));
    await h.step('Each problem tells you what is wrong, why it matters, and exactly how to fix it, with the corrected code ready to copy.', () => h.point('.bug >> nth=0'));
    await h.step('Open What it builds to read what the code does, and see the page running live. Real errors from your code appear in the console.', async () => { await h.click('[data-tab=builds]'); await h.scroll('#runArea', 'center'); });
    await h.wait(1200);
    await h.step('The Fixed code tab shows the complete corrected version, with every change highlighted.', () => h.click('[data-tab=fixed]'));
    await h.scrollBy(260);
    await h.step('You can copy it, download it, or download the full report.', () => h.point('#copyFixed'));
    await h.sampleDownload('#reportBtn', 'Bug report made in this video');
  }
});

S('qr-forge.html', {
  title: 'QR Forge', subtitle: 'Make a QR code for a link, Wi-Fi or contact',
  intro: 'Welcome to QR Forge. Let us make a QR code that people can scan with their phone camera.',
  async run(h) {
    await h.step('First choose what the code is for: a link or text, a Wi-Fi network, a contact card, a phone number or an email.', () => h.point('#qrType'));
    await h.step('Type the link you want people to open. The code updates instantly as you type.', () => h.type('#qrText', 'https://migabuilder.com'));
    await h.step('Pick the size and colours. A dark code on a light background scans best.', async () => { await h.select('#qrSize', '800'); await h.point('#qrDark'); });
    await h.step('Scan it with your phone to test it, then download the finished code as a picture.', () => h.point('#downloadBtn'));
    await h.sampleDownload('#downloadBtn', 'QR code made in this video');
  }
});

S('text-compare.html', {
  title: 'Text Compare', subtitle: 'See exactly what changed between two texts',
  intro: 'Welcome to Text Compare. It shows you exactly what changed between two versions of a text, like a contract, an essay or some code.',
  async run(h) {
    await h.step('Paste the original on the left and the new version on the right. Here we use two versions of a rental agreement.', () => h.click('#ex'));
    await h.scroll('#out');
    await h.step('Added words are green and removed words are red, so changes like a higher rent or a new rule are impossible to miss.', () => h.point('#diff'));
    await h.step('You can switch to one column, or to a words only view for essays, and ignore capital letters or extra spaces.', () => h.point('[name=view][value=prose]'));
    await h.sampleShot('#out', 'Comparison made in this video');
    await h.step('When you are done, download the comparison as a report to share it.', () => h.point('#dl'));
  }
});

// ---------------------------------------------------------------- helpers shared by several scenarios
async function answerAll(h, page, choiceSel, doneSel, max = 250) {
  for (let i = 0; i < max; i++) {
    if (await page.locator(doneSel).first().isVisible().catch(() => false)) return;
    const choices = page.locator(choiceSel + ':visible');
    const n = await choices.count();
    if (n) await choices.nth(Math.floor(Math.random() * n)).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);
    const next = page.locator('#nextBtn:visible:not([disabled])');
    if (await page.locator(doneSel).first().isVisible().catch(() => false)) return;
    if (await next.count()) await next.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(120);
  }
}

// ---------------------------------------------------------------- writing & documents
S('writing-forge.html', {
  title: 'Writing Forge', subtitle: 'Summarize, clean up and reshape text',
  intro: 'Welcome to Writing Forge. It cleans up and reshapes text instantly, right in your browser.',
  async run(h) {
    await h.step('Paste your text into the box. Here is a long, messy product description.', () => h.type('#input', 'Our bakery   opens every morning at seven.  We bake sourdough, rye and seeded bread using local flour, and our carrot cake has won three regional prizes. Customers love the quiet corner with free wifi, and on Saturdays we run a children\'s baking class that fills up quickly, so please book early.  Coffee is roasted by a small family business in the hills.'));
    await h.step('Press Summarize to keep only the most important sentences.', () => h.click('button:has-text("Summarize")'));
    await h.step('The result appears on the right. You can also clean spacing, shorten sentences, or change the capital letters.', () => h.point('#output'));
    await h.step('Copy the result, or download it as a text file.', () => h.point('#copy'));
    await h.sampleDownload('#download', 'Summary made in this video');
  }
});

S('grammar-forge.html', {
  title: 'Grammar Forge', subtitle: 'Check spelling and grammar privately',
  intro: 'Welcome to Grammar Forge. It checks your spelling and grammar privately, in six languages.',
  async run(h) {
    await h.step('Choose the language of your text, then type or paste your writing.', async () => { await h.point('#language'); await h.type('#editor', 'Me and him goes to the market yesterday, and we buyed alot of fresh vegetable. Their was a nice lady who help us to choose the best tomatos.', { visible: 60 }); });
    await h.step('Press Check writing. Every problem is underlined and explained in the list.', () => h.click('#check'));
    await h.step('Read each explanation and accept the fixes you agree with, or accept all the safe fixes at once.', () => h.point('#issues'));
    await h.click('#acceptAll');
    await h.sampleShot('main', 'Checked text from this video');
    await h.step('Finally, copy the corrected text and use it anywhere.', () => h.point('#copy'));
  }
});

S('site-checkup.html', {
  title: 'Website Checkup', subtitle: 'Find SEO and accessibility problems',
  intro: 'Welcome to Website Checkup. It reviews a web page for search engine and accessibility problems.',
  async run(h) {
    await h.step('Upload an HTML file or paste the code. Here we use the built in example.', () => h.click('#example'));
    await h.step('Press Run website checkup.', () => h.click('#audit'));
    await h.step('You get a score and a list of problems, such as missing page titles, images without descriptions, or links with unclear text.', () => h.point('#results'));
    await h.step('Work through the fixes one by one, then download the report to keep track.', () => h.point('#download'));
    await h.sampleDownload('#download', 'Checkup report made in this video');
  }
});

S('invoice-forge.html', {
  title: 'Invoice Forge', subtitle: 'Quotes and invoices in a minute',
  intro: 'Welcome to Invoice Forge. Let us make a professional invoice in about a minute.',
  async run(h, page) {
    await h.step('Enter your business name and your client’s name.', async () => { await h.type('#bizName', 'Sunrise Bakery'); await h.type('#clientName', 'Green Leaf Café'); });
    await h.step('Choose whether this is a quote or an invoice.', () => h.select('#docType', 'Invoice'));
    await h.step('Add each line item with a quantity and price. The totals are calculated for you.', async () => {
      const row = page.locator('#itemsBody tr, .item-row, tbody tr').first();
      const inputs = page.locator('input[placeholder="Description"]');
      await h.type(inputs.first(), 'Sourdough loaves');
      const q = page.locator('input[placeholder="1"]').first(); await h.fill(q, '20');
      const pr = page.locator('input[placeholder="0.00"]').first(); await h.fill(pr, '3.50');
    });
    await h.step('Add a discount or tax rate if you need one. The preview updates as you type.', async () => { await h.fill('#taxPct', '16'); await h.point('#previewFrame'); });
    await h.step('When it looks right, print it, save it as a PDF, or download it.', () => h.point('#printBtn'));
    await h.sampleDownload('#downloadBtn', 'Invoice made in this video');
  }
});

S('contract-forge.html', {
  title: 'Contract Forge', subtitle: 'Draft a straightforward agreement',
  intro: 'Welcome to Contract Forge. It helps you draft a clear, simple agreement.',
  async run(h) {
    await h.step('Enter your business name, choose the type of contract, and add the other party.', async () => { await h.type('#bizName', 'Sunrise Bakery'); await h.select('#contractType', 'Service Agreement'); await h.type('#otherParty', 'Daniel Mwangi Design'); });
    await h.step('Describe the work and the payment terms in plain words.', async () => { await h.type('#scope', 'Design a new logo, menu and shop sign for the bakery, with two rounds of changes.', { visible: 50 }); await h.type('#terms', 'Total fee 60,000 KES. Half on signing, half on delivery within 30 days.', { visible: 40 }); });
    await h.step('The contract preview fills in as you type. Both people can even sign on screen.', () => h.point('#previewFrame'));
    await h.step('Always read every clause carefully. Then print it or download it.', () => h.point('#printBtn'));
    await h.sampleDownload('#downloadBtn', 'Contract made in this video');
  }
});

S('cv-forge.html', {
  title: 'CV Forge', subtitle: 'A professional CV, downloaded as PDF',
  intro: 'Welcome to CV Forge. Let us make a professional CV and download it as a PDF.',
  async run(h) {
    await h.step('Choose a layout and an accent colour.', () => h.select('#template', 'modern'));
    await h.step('Fill in your name, job title and contact details. The preview updates as you type.', async () => { await h.type('#name', 'Amina Otieno'); await h.type('#role', 'Bakery Manager'); await h.type('#email', 'amina@example.com'); });
    await h.step('Add a short summary, your experience, education and skills.', async () => { await h.type('#summary', 'Friendly manager with eight years of experience running busy bakeries, training staff and growing sales.', { visible: 50 }); await h.type('#skills', 'Team leadership, Baking, Customer service, Stock control', { visible: 30 }); });
    await h.step('You can paste a job advert to see how well your CV matches it. When you are happy, download the PDF.', () => h.point('#pdfBtn'));
    await h.sampleDownload('#pdfBtn', 'CV made in this video');
  }
});

S('form-forge.html', {
  title: 'Form Forge', subtitle: 'Private forms and surveys',
  intro: 'Welcome to Form Forge. It makes a simple form or survey that you can share as a single file.',
  async run(h) {
    await h.step('Give the form a title and a short description.', async () => { await h.type('#title', 'Customer feedback'); await h.type('#description', 'Tell us how we did today'); });
    await h.step('List your questions, one per line.', () => h.type('#questions', 'Your name\nHow was your visit?\nWhat should we bake next?\nMay we contact you?', { visible: 40 }));
    await h.step('Press Preview form to see exactly what people will fill in.', () => h.click('#preview'));
    await h.step('Download the form as one file and share it by email or on your website.', () => h.point('#download'));
    await h.sampleDownload('#download', 'Form made in this video');
  }
});

S('everyday-forge.html', {
  title: 'Everyday Forge', subtitle: 'Charts, passwords and quick converters',
  intro: 'Welcome to Everyday Forge. It bundles everyday helpers: charts, writing tools, passwords and converters.',
  async run(h) {
    await h.step('Let us make a chart. Choose the chart type and give it a title.', async () => { await h.select('#chartType', 'bar'); await h.type('#chartTitle', 'Bread sold this week'); });
    await h.step('Type one label and number per line.', () => h.type('#chartData', 'Monday, 42\nTuesday, 38\nWednesday, 51\nThursday, 47\nFriday, 66\nSaturday, 90', { visible: 30 }));
    await h.step('Press Create chart.', () => h.click('#drawChart'));
    await h.step('Your chart is ready to download as a picture. The other tabs generate passwords and convert units and currencies.', () => h.point('#saveChart'));
    await h.sampleDownload('#saveChart', 'Chart made in this video');
  }
});

S('utility-forge.html', {
  title: 'Utility Forge', subtitle: 'CSV, JSON, text and checksums',
  intro: 'Welcome to Utility Forge. It converts data files and checks files, privately in your browser.',
  async run(h) {
    await h.step('Choose the conversion. Here we turn a spreadsheet in CSV format into JSON for a web app.', () => h.select('#direction', 'csv-json'));
    await h.step('Paste your data.', () => h.type('#dataInput', 'product,price,in_stock\nSourdough,3.50,yes\nRye,3.20,yes\nCarrot cake,4.50,no', { visible: 40 }));
    await h.step('Press Convert, and the result appears below.', () => h.click('#convert'));
    await h.step('Download the result. The other tabs combine text files and create checksums to verify downloads.', () => h.point('#downloadData'));
    await h.sampleDownload('#downloadData', 'Converted data from this video');
  }
});

S('palette-forge.html', {
  title: 'Palette Forge', subtitle: 'Accessible colour palettes',
  intro: 'Welcome to Palette Forge. It builds a colour palette for your brand that is easy to read.',
  async run(h) {
    await h.step('Pick a base colour for your brand.', () => h.point('#baseColor'));
    await h.step('Choose a harmony, such as complementary or triadic, and press Generate palette.', async () => { await h.select('#harmonyType', 'triadic'); await h.click('#generateBtn'); });
    await h.step('Each colour shows its code and how readable text is on it.', () => h.point('#swatches'));
    await h.sampleShot('#swatches', 'Palette made in this video');
    await h.step('Copy the colour codes, or copy them as ready made CSS for your website.', () => h.point('#copyCssBtn'));
    await h.step('The contrast checker tests text on a background against the accessibility guidelines. Grey on white only just fails for normal text.', async () => { await h.scroll('#contrastPanel', 'start'); await h.fill('#ccFgHex', '#777777'); await h.fill('#ccBgHex', '#FFFFFF'); });
    await h.step('Press Fix the text colour, and it finds the closest colour that passes. Below are the readable pairs in your palette.', async () => { await h.click('#ccFix'); await h.point('#ccPairs'); });
  }
});

S('name-forge.html', {
  title: 'Name Forge', subtitle: 'Business names and domains',
  intro: 'Welcome to Name Forge. It helps you brainstorm a name for your business.',
  async run(h, page) {
    await h.step('Describe what your business does, and choose a style.', async () => { await h.type('#keywordInput', 'organic bakery with coffee'); await h.select('#styleInput', 'playful'); });
    await h.step('Press Generate names.', () => h.click('#generateBtn'));
    await h.skip('Skipping ahead while names are generated', () => page.waitForFunction(() => document.querySelectorAll('#nameList > *').length > 2, null, { timeout: 120000 }));
    await h.step('Shortlist the names you like and check whether the web address is free. Press More ideas for a new batch.', () => h.point('#nameList'));
    await h.sampleShot('#nameList', 'Name ideas from this video');
  }
});

S('repurpose-forge.html', {
  title: 'Repurpose Forge', subtitle: 'One idea, a whole publishing pack',
  intro: 'Welcome to Repurpose Forge. It turns one piece of content into posts for every channel.',
  async run(h) {
    await h.step('Paste your original content or idea.', () => h.type('#source', 'This Saturday we open our new children\'s baking class. Kids aged 6 to 12 learn to bake bread rolls and cookies, and take everything home.', { visible: 60 }));
    await h.step('Say who it is for and what you want people to do.', async () => { await h.type('#audience', 'Parents in Nairobi'); await h.type('#goal', 'Book a place on our website'); });
    await h.step('Press Create publishing pack.', () => h.click('#generate'));
    await h.step('You get versions for social media, email and more. Personalise them, then copy the ones you need.', () => h.point('#outputs'));
    await h.sampleShot('#outputs', 'Publishing pack made in this video');
  }
});

// ---------------------------------------------------------------- learn & tests
S('big-five.html', {
  title: 'Big Five Personality', subtitle: 'A private 50-question personality report',
  intro: 'Welcome to the Big Five personality test. It describes your personality across five well researched dimensions.',
  async run(h, page) {
    await h.step('Press Start. Everything stays private in your browser.', () => h.click('#startBtn'));
    await h.step('Read each statement and choose how accurately it describes you. There are no right or wrong answers.', () => h.point('.choice >> nth=3'));
    await h.skip('Skipping ahead through the 50 questions', () => answerAll(h, page, '.choice', '#results'));
    await h.step('Your report shows where you are on each dimension, with a plain language explanation.', () => h.point('#results'));
    await h.sampleShot('#results', 'Example report from this video');
  }
});

S('strength-compass.html', {
  title: 'Strength Compass', subtitle: 'Discover your top five strengths',
  intro: 'Welcome to Strength Compass. It helps you discover the strengths that shape how you work.',
  async run(h, page) {
    await h.step('Press Begin. Each question shows two statements.', () => h.click('#startBtn'));
    await h.step('Choose which one sounds more like you, or both equally.', () => h.point('.choice >> nth=1'));
    await h.skip('Skipping ahead through the questions', () => answerAll(h, page, '.choice', '#results'));
    await h.step('Your top five strengths appear with ideas for using them at work.', () => h.point('#results'));
    await h.sampleShot('#results', 'Example strengths report from this video');
  }
});

S('reasoning-test.html', {
  title: 'Reasoning Test', subtitle: 'Practise reasoning with worked explanations',
  intro: 'Welcome to the Reasoning Test. It helps you practise number, word and pattern reasoning.',
  async run(h, page) {
    await h.step('Choose the test length, then press Start.', async () => { await h.select('#length', '21'); await h.click('#startBtn'); });
    await h.step('Pick the answer you think is right. The questions get harder as you go.', () => h.point('.answer >> nth=0'));
    await h.skip('Skipping ahead through the questions', () => answerAll(h, page, '.answer', '#results'));
    await h.step('At the end you see your score, and a worked explanation for every question, so you learn how to solve them.', () => h.point('#results'));
    await h.sampleShot('#results', 'Example result from this video');
  }
});

S('pattern-lab.html', {
  title: 'Work Pattern Test', subtitle: 'Practise employer-style pattern questions',
  intro: 'Welcome to the Work Pattern Test. It lets you practise the pattern questions many employers use.',
  async run(h, page) {
    await h.step('Press Start to begin a practice set.', () => h.click('#startBtn'));
    await h.step('Find the rule in the pattern and pick what comes next.', () => h.point('.answer >> nth=0'));
    await h.skip('Skipping ahead through the questions', () => answerAll(h, page, '.answer', '#results'));
    await h.step('Your result shows each answer with a worked explanation. You can print the report or try a new set.', () => h.point('#results'));
    await h.sampleShot('#results', 'Example result from this video');
  }
});

S('geo-forge.html', {
  title: 'Geography Forge', subtitle: 'Explore every country, then take a quiz',
  intro: 'Welcome to Geography Forge. Explore any country on the world map, then test yourself with a quiz.',
  async run(h, page) {
    await h.step('Click a country on the map, or search for it. Let us look at Kenya.', async () => { await h.type('#search', 'Kenya'); await page.keyboard.press('Enter'); await page.locator('#search').dispatchEvent('change'); });
    await h.wait(1500);
    await h.step('You get the capital, currency, languages and government, plus its history and customs.', () => h.point('#info'));
    await h.step('Every country you open is saved, so you can build a quiz from what you explored.', () => h.scroll('#quizPanel'));
    await h.step('Choose the questions and press Generate quiz.', async () => { await h.select('#qSource', 'Africa'); await h.click('#makeQuiz'); });
    await h.step('Answer each question and see an explanation straight away.', () => h.click('.opt >> nth=0'));
    await h.sampleDownload('#printQuiz', 'Printable quiz made in this video');
  }
});

S('idea-atlas.html', {
  title: 'Idea Atlas', subtitle: 'Philosophy and politics, connected',
  intro: 'Welcome to Idea Atlas. Explore the history of philosophies and political ideologies, and how they connect.',
  async run(h, page) {
    await h.step('Each circle on the map is an idea. Older ideas are on the left and newer ones on the right, and the lines show who influenced whom.', () => h.point('#net'));
    await h.step('Click an idea to read its history, core ideas and key thinkers. Let us open Stoicism.', () => h.click('.node:has(title:has-text("Stoicism")) circle', { force: true }));
    await h.step('You see what it drew on, what it influenced, and what its critics say.', () => h.scroll('#info .links', 'center'));
    await h.step('You can also switch to a timeline or a list.', () => h.click('[data-view=tl]'));
    await h.step('Now the game. Choose the questions and press Generate quiz. Challenge mode gives you twenty seconds per question, with bonus points for speed and streaks.', async () => { await h.scroll('#quizPanel'); await h.click('#makeQuiz'); });
    await h.step('Pick an answer. You get an explanation every time, and your best score is saved.', () => h.click('#qOpts .opt >> nth=0'));
    await h.sampleDownload('#printQuiz', 'Printable quiz made in this video');
  }
});

S('exam-checker.html', {
  title: 'Exam Checker', subtitle: 'Mark a whole class from photos of answer sheets',
  intro: 'Welcome to Exam Checker. Build an exam, print an answer sheet for every student, drop in photos of all the sheets at once, and download everyone\u2019s marks.',
  async run(h, page) {
    await h.step('The How to use box at the top lists the six steps. Press Load demo exam to see a finished example with a class of six.', async () => { await h.point('#howto summary'); await h.click('#demoExam'); });
    // Written-answer OCR loads Tesseract from a CDN; keep the recording offline and quick.
    await page.evaluate(() => { const o = document.querySelector('#ocrOn'); o.checked = false; o.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#howto').open = false; });
    await h.step('Step one: build the exam. Each question has a type: multiple choice, choose all that apply, true or false, a short answer or an open answer, with its points.', () => h.point('.qcard >> nth=0'));
    await h.step('Paste your class list here, one student per line, with their ID and name.', async () => { await h.click('#t-build details.box >> nth=1 >> summary'); await h.point('#exRoster'); });
    await h.step('Step two is the answer key. Tap the correct bubble for each question, or read the key from a photo of a filled-in sheet.', async () => { await h.click('[data-tab=key]'); await h.point('#keyList'); });
    await h.step('Step three: press Print one sheet per student. Every sheet has the student\u2019s name, their ID and a code printed on it.', async () => { await h.click('[data-tab=sheet]'); await h.select('#prevWhich', 'personal'); await h.point('#printPersonal'); });
    await h.step('The code along the bottom edge tells the checker whose sheet it is, so nobody has to type names, and the photos can be in any order.', () => h.point('#sheetPrev svg >> nth=0', { block: 'end' }));
    await h.step('Step four tests the reader. Photograph a sheet with the correct answers, and the checker compares every answer with your key. Here we use a test photo.', async () => { await h.click('[data-tab=check]'); await h.click('#checkDemo'); await page.waitForSelector('#checkOut .tile', { timeout: 60000 }); });
    await h.step('Every answer matches, and it even knows whose sheet it is. Now you are ready to mark the class.', () => h.point('#checkOut .tile >> nth=0'));
    await h.step('Step five: drop in the photos of all the sheets at once, in any order. Here we add demo photos: they are shuffled, one sheet is photographed twice, and one student is missing.', async () => { await h.click('[data-tab=students]'); await h.click('#stuDemo'); });
    await h.skip('Reading the answer sheets', () => page.waitForFunction(() => /Done/.test(document.querySelector('#stuProg').textContent), null, { timeout: 180000 }));
    await h.step('Every photo went to the right student. The sheet photographed twice was counted only once, and the class list shows who is not marked yet.', () => h.point('#classCheck'));
    await h.step('Find a student, show only the ones that need checking, or sort by score.', async () => { await h.select('#stuFilter', 'check'); await h.select('#stuSort', 'high'); });
    await h.step('Press Next answer to check. It opens the next student with something for you to look at: a faint mark, two filled bubbles, or a written answer.', async () => { await h.click('#stuFlagged'); await h.wait(900); await h.point('#review h2'); });
    await h.step('Correct answers are circled in green and wrong ones in red. Tap a bubble to fix an answer.', () => h.point('#rvImgs canvas'));
    await h.step('Written answers are shown as pictures. Type what the student wrote, and it is marked automatically.', async () => { await h.type('#rvAns [data-sq][data-sf=text] >> nth=0', 'H2O'); await h.wait(1200); });
    await h.step('Step six shows the results: the average, the spread of scores, every student\u2019s answers, and which questions most students missed.', () => h.click('[data-tab=results]'));
    await h.step('Download everyone\u2019s answers as Excel or CSV, a class report, or printable result slips for each student.', () => h.point('#dlXlsx'));
    await h.sampleDownload('#dlCsv', 'Class results spreadsheet made in this video');
  }
});

S('body-map.html', {
  title: 'Body Map', subtitle: 'How every part of the body works',
  intro: 'Welcome to Body Map. Learn how every organ, bone, muscle and layer of skin works, what can go wrong with it, and how to keep it healthy.',
  async run(h, page) {
    await h.step('The map shows the main organs and body parts. Hover over one to see its name, and click to open it. Let us open the heart.', () => h.click('#p-heart'));
    await h.step('You see what it does, where it is, and how it works, step by step.', () => h.scroll('#info .sect >> nth=0', 'center'));
    await h.step('Connections show how it works with other parts of the body. The connected parts light up on the map.', () => h.point('#info .conn >> nth=0'));
    await h.step('Every part lists its common illnesses. Open one to see the signs, the best way to treat it, and how to prevent it. Possible emergencies are clearly marked.', () => h.click('#info details.ill >> nth=0 >> summary'));
    await h.step('Below that are the best ways to keep it healthy, and some surprising facts.', () => h.scroll('#info .tip-list', 'center'));
    await h.step('Use the coloured buttons to show one body system, like digestion, then click any organ in it, like the liver.', async () => { await h.click('[data-sys=digestive]'); await h.click('#p-liver'); });
    await h.step('The connections map shows how every part works together with the others.', async () => { await h.click('[data-sys=""]'); await h.click('[data-view=net]'); });
    await h.wait(1500);
    await h.step('The layer buttons switch between organs, the skeleton, muscles and tendons, and a cut-through view of the skin. Here is the skeleton. Let us open the spine.', async () => { await h.click('[data-view=body]'); await h.click('[data-layer=skeleton]'); await h.point('#p-spine'); await page.locator('#p-spine').dispatchEvent('click'); });
    await h.step('Muscles and tendons have a front and a back view. Muscles are red and tendons are white, like the Achilles tendon at the back of the ankle.', async () => { await h.click('[data-layer=muscles]'); await h.click('#flip'); await h.point('#p-achilles'); await page.locator('#p-achilles').dispatchEvent('click'); });
    await h.step('The skin layers view shows the outer skin, the dermis and the fat layer, with hair, oil glands and sweat glands. Tap any of them.', async () => { await h.click('[data-layer=skin]'); await h.point('#p-sweat'); await page.locator('#p-sweat').dispatchEvent('click'); });
    await h.step('Now, what happens when we eat? Open Eating and drinking. The dot follows a meal through the body.', async () => { await h.click('[data-view=body]'); await h.click('[data-tab=food]'); for (let i = 0; i < 4; i++) { await h.click('#nextStep', { after: 700 }); } });
    await h.step('The stomach churns the food with acid, the pancreas and gallbladder add their juices, and the small intestine absorbs the nutrients into the blood.', async () => { for (let i = 0; i < 3; i++) { await h.click('#nextStep', { after: 1400 }); } });
    await h.step('Switch to a drink to see how water reaches the blood, the kidneys and the bladder.', async () => { await h.click('[data-journey=drink]'); for (let i = 0; i < 6; i++) { await h.click('#nextStep', { after: 500 }); } });
    await h.step('Tap a card to see which organs handle carbohydrates, fats, caffeine or alcohol.', () => h.click('.ncard >> nth=7'));
    await h.step('The Fasting tab shows what happens hour by hour after your last meal. Drag the slider, or pick a fast like sixteen hours.', async () => { await h.click('[data-tab=fast]'); await h.click('[data-h="16"]'); });
    await h.step('After about a day, the liver has used up its stored sugar. The body burns more fat and makes ketones, and the bar shows where the energy comes from.', async () => { await h.click('[data-h="24"]'); await h.point('#fuel'); });
    await h.step('Safety notes explain why you must keep drinking water, and who should not fast without a doctor.', () => h.scroll('#fastNotes', 'center'));
    await h.step('Now test yourself. Choose the whole body, one body system or one body part, and press Generate quiz.', async () => { await h.scroll('#quizPanel'); await h.select('#qSource', 'sys:circulatory'); await h.click('#makeQuiz'); });
    await h.step('Pick an answer. You get an explanation every time, and your best score is saved.', () => h.click('#qOpts .opt >> nth=0'));
    await h.step('You can also make your own quiz. Give it a title, choose a body part, and add suggested questions. Then edit them, or write your own.', async () => { await h.click('[data-qtab=make]'); await h.type('#mkTitle', 'The heart quiz'); await h.select('#mkPart', 'heart'); await h.click('#mkSuggest'); });
    await h.step('Play it, save it, print it with an answer key, or copy a link to share it with a class or a friend.', () => h.point('#mkShare'));
    await h.sampleDownload('#mkPrint', 'Printable quiz made in this video');
    await h.step('Finally, the daily checklist shows which healthy habits help which parts of your body.', async () => { await h.scroll('#habitPanel'); await h.click('#habits .habit >> nth=0'); });
  }
});

S('biology-map.html', {
  title: 'Biology Map', subtitle: 'The tree of life, DNA and evolution',
  intro: 'Welcome to Biology Map. See how humans are related to other living things, how much DNA we share, and how DNA, genes, mutations and evolution work.',
  async run(h, page) {
    await h.step('The tree of life shows forty-three living things, from bacteria to humans. Every branch point is a common ancestor. Let us open the chimpanzee.', () => h.click('[data-l=chimp]'));
    await h.step('Chimpanzees share about ninety-nine percent of our DNA letters, and our lines split about six and a half million years ago. The gold and blue lines show both paths back to that ancestor.', () => h.point('#info .simbar'));
    await h.step('You also see what we both inherited, and what evolved on each line since the split.', () => h.scroll('#info .inn', 'center'));
    await h.step('Now a distant relative: the banana. We shared an ancestor over one and a half billion years ago.', async () => { await h.scroll('#tree'); await h.click('[data-l=banana]'); });
    await h.step('Sixty percent of banana genes have a human counterpart — but that does not mean sixty percent of our DNA letters match. The tool always says what each number measures.', () => h.point('#info .sect >> nth=0'));
    await h.step('The ranking compares all the figures side by side.', () => h.click('[data-tv=rank]'));
    await h.step('Tap any branch point to see what evolved there, like the first mammals, with hair and milk.', async () => { await h.click('[data-tv=tree]'); await h.click('[data-n=mammals]'); });
    await h.step('Drag the time slider to travel back and see the key events in the history of life.', async () => { await h.point('#time'); await page.locator('#time').evaluate(e => { e.value = 620; e.dispatchEvent(new Event('input')); }); await h.point('#timeEv'); });
    await h.step('What DNA is: a double helix written with four letters, A, T, G and C. Tap each level to zoom from your body down to a single letter.', async () => { await h.click('[data-tab=dna]'); await h.click('.lvl >> nth=2'); await h.click('.lvl >> nth=5'); });
    await h.step('Type letters to build a DNA strand. The matching strand appears, because A always pairs with T, and G with C.', () => h.type('#strandIn', 'ATGGCTAGCTTAG'));
    await h.step('Gene expression shows, step by step, how a gene is copied into RNA and translated into a protein.', async () => { await h.click('[data-tab=expr]'); await h.click('#eNext', { after: 900 }); await h.click('#eNext', { after: 900 }); await h.click('#eNext', { after: 900 }); await h.click('#eNext', { after: 900 }); });
    await h.step('The codon translator reads real DNA three letters at a time. Here is the start of the insulin gene.', () => h.click('[data-code^=ATGGCCCTG]'));
    await h.step('In the mutation lab you can change a real human gene. Try the sickle cell mutation: one letter changes, and one amino acid in haemoglobin changes with it.', async () => { await h.click('[data-tab=mut]'); await h.click('[data-mp="0"]'); await h.point('#mOut .verdict'); });
    await h.step('Delete a single letter and the whole reading frame shifts — a frameshift that breaks the protein.', async () => { await h.click('[data-mp="3"]'); await h.point('#mOut .verdict'); });
    await h.step('The evolution simulator shows natural selection. On dark bark, dark moths are hidden from birds, and in a few dozen generations they take over.', async () => { await h.click('[data-tab=evo]'); await h.click('#simRun'); await h.wait(6500); await h.point('#chart'); });
    await h.step('Human diversity follows our ancestors out of Africa to every continent.', async () => { await h.click('[data-tab=div]'); await h.click('#playMig'); await h.wait(7000); });
    await h.step('Tap a pin to see how a population adapted, like Tibetans living at high altitude with a gene they got from Denisovans.', async () => { await h.click('#showAll'); await h.click('[data-pin="0"]'); });
    await h.step('The facts explain that any two people share about 99.9 percent of their DNA, and that most variation is found within groups, not between them.', () => h.scroll('#divFacts', 'center'));
    await h.step('Finally, test yourself. Choose a topic and press Generate quiz.', async () => { await h.scroll('#quizPanel'); await h.select('#qSource', 'tree'); await h.click('#makeQuiz'); });
    await h.step('Pick an answer to see the explanation. You can also print a quiz with an answer key.', () => h.click('#qOpts .opt >> nth=0'));
    await h.sampleDownload('#printQuiz', 'Printable quiz made in this video');
  }
});

S('chemistry-map.html', {
  title: 'Chemistry Map', subtitle: 'The periodic table and what elements make',
  intro: 'Welcome to Chemistry Map. Explore all one hundred and eighteen elements, see how they combine, and discover what materials they make.',
  async run(h, page) {
    await h.step('Every element has its own square, coloured by its family. Hover over one for a quick summary.', async () => { await h.point('#el-Na'); await h.point('#el-Fe'); });
    await h.step('Open an element, like carbon. You see its atom, with protons and neutrons in the nucleus and electrons in shells.', async () => { await page.locator('#addMode').setChecked(false); await h.click('#el-C'); await h.point('#atom'); });
    await h.step('Then where it is found, what it is used for, and its different forms — carbon can be diamond, graphite or graphene.', () => h.scroll('#info .sect >> nth=2', 'center'));
    await h.step('It lists the compounds it makes and the materials made with it.', () => h.scroll('#info .cpd >> nth=0', 'center'));
    await h.step('The colour buttons show patterns. Solid, liquid or gas shows each element at the temperature you choose. At room temperature only mercury and bromine are liquid.', async () => { await h.scroll('#modes'); await h.click('[data-mode=state]'); await h.point('#el-Hg'); });
    await h.step('Heat it to the surface of the Sun, and almost everything boils.', async () => { await h.click('[data-t="5500"]'); await h.wait(800); });
    await h.step('Electronegativity shows which atoms pull electrons hardest — fluorine, at the top right.', async () => { await h.click('[data-mode=en]'); await h.point('#el-F'); });
    await h.step('Now mix elements. With this box ticked, tapping the table puts elements in the bowl. Add sodium and chlorine.', async () => { await h.click('[data-mode=family]'); await page.locator('#addMode').setChecked(true); await h.click('#el-Na'); await h.click('#el-Cl'); });
    await h.step('The mixer explains the bond — sodium gives an electron to chlorine, an ionic bond — predicts the formula, NaCl, and shows the real compound: table salt.', () => h.point('#labOut .ccard >> nth=1'));
    await h.step('Try a classic like calcium, carbon and oxygen, which make limestone, chalk and seashells.', async () => { await h.click('[data-p="6"]'); await h.point('#labOut .ccard >> nth=1'); });
    await h.step('Materials shows what the elements build. Tap one, like a lithium-ion battery, and its elements light up in the table.', async () => { await h.click('[data-tab=mat]'); await h.click('[data-m=liion]'); await h.scroll('#ptable', 'center'); await h.wait(1200); });
    await h.step('The formula calculator works out molar mass and what share each element makes up. Here is glucose.', async () => { await h.click('[data-tab=calc]'); await h.type('#formula', 'C6H12O6'); await h.point('#calcOut'); });
    await h.step('How atoms bond explains atoms, shells, and ionic, covalent and metallic bonds with diagrams.', () => h.click('[data-tab=learn]'));
    await h.step('Search for any use, like battery, to light up every element that is used in batteries.', async () => { await h.type('#search', 'battery'); await page.locator('#search').dispatchEvent('change'); await h.scroll('#ptable', 'center'); await h.wait(1200); });
    await h.step('Finally, test yourself. Choose the elements and question types, then press Generate quiz.', async () => { await h.scroll('#quizPanel'); await h.select('#qSource', 'first20'); await h.click('#makeQuiz'); });
    await h.step('Pick an answer and you get an explanation, with a link to open that element.', () => h.click('#qOpts .opt >> nth=0'));
    await h.sampleDownload('#printQuiz', 'Printable quiz made in this video');
  }
});

S('alphabet-forge.html', {
  title: 'Alphabet Forge', subtitle: 'Hear, learn and write the world’s alphabets',
  intro: 'Welcome to Alphabet Forge. Learn to read, say and write alphabets from around the world.',
  async run(h, page) {
    await h.step('Choose a writing system: Thai, Arabic, Mandarin, Japanese, Korean and many more.', () => h.click('.script-card:has-text("Thai")'));
    await h.step('Each symbol sits in its own square. Tap one to hear it.', () => h.click('.sym >> nth=0'));
    await h.step('You see a real word that uses it, and why it sounds that way. In Thai, the consonant class decides the tone of the word.', () => h.point('#detail .why'));
    await h.step('Now Arabic. Arabic letters change shape depending on where they are in a word: alone, at the start, in the middle or at the end.', async () => { await h.click('.script-card:has-text("Arabic")'); await h.click('.sym >> nth=13'); await h.point('.forms'); });
    await h.step('Korean letters are pictures of the mouth. This one, ㄱ, shows the back of the tongue touching the roof of the mouth, which makes the g sound.', async () => { await h.click('.script-card:has-text("Korean")'); await h.click('.sym >> nth=0'); });
    await h.step('Scroll down to practise writing. Trace mode shows a faint guide you can write over.', async () => { await h.click('#practiseThis'); await h.scroll('#pad', 'center'); });
    await h.step('Write the letter with your finger or mouse, then press Check to get a score.', async () => {
      // Measure the guide letter, then trace its two strokes: across the top, then down the right side.
      const g = await page.evaluate(() => { const c = document.getElementById('guide'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height; let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (d[(y * W + i) * 4 + 3] > 20) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        let t = 0; const mid = Math.round((x0 + x1) / 2); for (let y = y0; y < y1 && d[(y * W + mid) * 4 + 3] > 20; y++) t++; return { x0: x0 / W, y0: y0 / H, x1: x1 / W, y1: y1 / H, t: t / H }; });
      const box = await page.locator('#ink').boundingBox(), P = (x, y) => [box.x + box.width * x, box.y + box.height * y];
      const yTop = g.y0 + g.t / 2, xRight = g.x1 - g.t / 2;
      await page.mouse.move(...P(g.x0 + 0.01, yTop)); await page.mouse.down();
      await page.mouse.move(...P(xRight, yTop), { steps: 25 });
      await page.mouse.move(...P(xRight, g.y1 - 0.01), { steps: 30 }); await page.mouse.up();
      await h.click('#checkPad');
    });
    await h.step('When you are ready, take the listening quiz: hear a sound and pick the right symbol.', async () => { await h.scroll('#quizPanel'); await h.point('#quizListen'); });
    await h.sampleShot('#practice', 'Writing practice from this video');
  }
});

S('jam-forge.html', {
  title: 'Jam Forge', subtitle: 'Split-screen collabs, duets and conversations',
  intro: 'Welcome to Jam Forge. Record several clips and put them together into one video: a band playing together, a duet, or two people talking.',
  async run(h, page) {
    await h.step('Pick what you want to make. Band split screen sets up a grid where every clip plays at the same time.', () => h.click('#idea-band'));
    await h.step('Already made your videos? Join videos you already have puts them into one. Choose them, pick the order, such as by file name or date, and whether they play one after another or all at once.', async () => { await h.scroll('#joinPanel', 'start'); await h.point('#joinDrop'); await h.select('#joinOrder', 'name'); await h.point('#joinMode'); await h.select('#joinOrder', 'pick'); });
    await h.step('Sam recorded the drums and Ali the guitar, each at home. Add their clips with Add video or audio files, or drop them on the page.', async () => { await h.scroll('#recordPanel', 'center'); await h.point('label:has(#fileInput)'); await h.upload('#fileInput', ['jam-drums.webm', 'jam-guitar.webm']); await page.waitForFunction(() => document.querySelectorAll('.clip').length === 2); await h.fill('#clip-0 .name', 'Sam — drums'); await h.fill('#clip-1 .name', 'Ali — guitar'); });
    await h.step('Each of them clapped once at the start. Press Sync by clap, and the clips line up on the clap.', async () => { await h.scroll('#clipsPanel', 'start'); await h.click('#clapBtn'); await h.wait(1800); await h.point('#syncStatus'); });
    await h.step('Now record your own part. Turn on the camera, write your name, and keep Play along on, so you hear the band in your headphones while you record.', async () => { await h.scroll('#recordPanel', 'start'); await h.click('#camBtn'); await h.type('#recName', 'Vocals — Mia'); await h.point('#playAlong'); });
    await h.step('Press Record. After the count in, the band starts and you play along. Press Stop when you are done.', async () => { await h.click('#recBtn'); await h.wait(5200); await h.click('#recStopBtn'); await page.waitForFunction(() => document.querySelectorAll('.clip').length === 3); });
    await h.step('Want a talking character? Add a recorded voice and choose a frog. Its mouth moves with the sound.', async () => { await h.upload('#fileInput', 'voice.wav'); await page.waitForFunction(() => document.querySelectorAll('.clip').length === 4); await h.scroll('#clip-3', 'center'); await h.select('#clip-3 [data-f=char]', 'frog'); await h.fill('#clip-3 .name', 'Frog'); });
    await h.step('Press Play to watch all four at once.', async () => { await h.scroll('#previewPanel', 'start'); await h.click('#stopBtn'); await h.click('#playBtn'); await h.wait(3500); });
    await h.step('Taking turns keeps everyone on screen and lights up whoever is talking. It is perfect for a conversation, or a chat with a frog.', async () => { await h.click('#playBtn'); await h.click('#mode-conversation'); await h.scroll('#stage', 'center'); await h.click('#stopBtn'); await h.click('#playBtn'); await h.wait(3500); await h.click('#playBtn'); });
    await h.step('Back to At the same time. Choose a layout, such as one big clip with the others beside it.', async () => { await h.click('#mode-together'); await h.click('#layout-spotlight'); });
    await h.step('Choose a wide, tall or square video, add a title, and press Make the video. It is made on your device, in real time.', async () => { await h.scroll('#exportPanel', 'start'); await h.point('#aspect'); await h.type('#title', 'Sunday jam'); await h.click('#exportBtn'); });
    await h.skip('Skipping ahead while the video is made', () => page.waitForSelector('#downloadLink', { timeout: 180000 }));
    await h.step('Download it and share it. Your clips are kept in this browser, so you can come back and change it.', () => h.point('#downloadLink'));
    await h.sampleDownload('#downloadLink', 'Video made in this video');
  }
});

S('redact-forge.html', {
  title: 'Redact Forge', subtitle: 'Hide secrets and personal data before you share a log',
  intro: 'Welcome to Redact Forge. Before you paste a log or an error into an AI or a bug report, hide the keys, passwords and personal data in it.',
  async run(h, page) {
    await h.step('Paste a log, an error message or a config file, or open a file. Here is an example log full of keys and personal data.', () => h.click('#exampleBtn'));
    await h.step('On the right is the safe version. Every key, password, email, IP address, card number and ID number is replaced, and highlighted so you can check it.', () => h.point('#output'));
    await h.step('Below, you see what was found, and how many of each.', () => h.point('#counts'));
    await h.step('Choose how to replace things. Realistic fakes keep the log looking real.', async () => { await h.scroll('#optionsPanel', 'start'); await h.click('#style-fake'); });
    await h.step('Numbered labels keep the same value as the same label everywhere, so the log still makes sense.', () => h.click('#style-numbered'));
    await h.step('Add your own words, such as names, projects or server names, and they are hidden too.', async () => { await h.type('#words', 'shop'); await h.scroll('#mainPanel', 'start'); await h.point('#output'); });
    await h.step('Press Copy, and paste the safe text into ChatGPT, Claude or your bug report.', () => h.click('#copyBtn'));
    await h.step('When the answer comes back with the labels, paste it here, and the real values are put back, only on your device.', async () => { await h.scroll('#restorePanel', 'start'); await h.type('#restoreIn', 'The login for [EMAIL_1] fails because the database at [IP_2] refused the password.'); await h.point('#restoreOut'); });
    await h.scroll('#mainPanel', 'start');
    await h.sampleDownload('#downloadBtn', 'Cleaned log from this video');
  }
});

S('voice-forge.html', {
  title: 'Voice Forge', subtitle: 'Turn a script into a natural voice-over',
  intro: 'Welcome to Voice Forge. Paste a script, choose a voice, and download a natural voice-over as an MP3, for free and without uploading anything.',
  async run(h, page) {
    await h.step('Paste or type your script. Here is a short advert for a bakery. An empty line between paragraphs becomes a pause.', async () => { await page.waitForSelector('#lang option[value="en_US"]', { state: 'attached', timeout: 60000 }); await h.click('#exampleBtn'); });
    await h.step('Choose the language. There are more than thirty-five, from English and Swedish to Arabic, Chinese and Swahili.', () => h.point('#lang'));
    await h.step('Then pick a voice. Natural voices sound best, and fast ones are smaller to download.', async () => { await h.select('#voice', 'en_US-lessac-medium'); });
    await h.step('Press Make the voice-over. The first time, the voice is downloaded once and kept on your device, so next time it starts at once, even offline.', () => h.click('#speakBtn'));
    await h.skip('Skipping ahead while the voice downloads and speaks', () => page.waitForSelector('#resultPanel:not(.hidden)', { timeout: 300000 }));
    await h.step('Here is your voice-over. Listen to it right here.', () => h.point('#player'));
    await h.step('Download it as an MP3 or a WAV file, and use it as narration in your videos, slides or podcast.', () => h.point('#mp3Btn'));
    await h.sampleDownload('#mp3Btn', 'Voice-over made in this video');
    await h.step('Voices you have used are listed here, and you can remove them to free up space.', async () => { await h.scroll('#savedPanel', 'center'); await h.point('#saved'); });
  }
});

S('vector-forge.html', {
  title: 'Vector Forge', subtitle: 'Turn a PNG or JPG logo into a sharp SVG',
  intro: 'Welcome to Vector Forge. It turns a logo, icon or drawing saved as a picture into a sharp vector that stays crisp at any size.',
  async run(h, page) {
    await h.step('Open a PNG or JPG, drop it on the page, or paste it. Here is a small, slightly blurry logo, like one saved from a website.', async () => { await h.click('#exampleBtn'); await page.waitForSelector('#svgStage svg'); });
    await h.step('On the right is the vector version. It is made of smooth shapes instead of pixels.', () => h.point('#svgStage'));
    await h.step('Zoom in to compare. The picture gets blurry, but the vector stays sharp.', () => h.click('#zoomBtn'));
    await h.wait(1200);
    await h.click('#zoomBtn');
    await h.step('Choose a starting point: a logo, black and white, a drawing or signature, a detailed picture, or a poster effect.', async () => { await h.scroll('#settingsPanel', 'start'); await h.click('#preset-bw'); await h.wait(900); await h.click('#preset-logo'); });
    await h.step('Fewer colors give a cleaner, smaller file. Detail decides how closely it follows the edges, and Remove specks clears away dust.', () => h.point('#colors'));
    await h.step('Tick Remove the background, and the logo can sit on any color.', () => h.check('#removeBg'));
    await h.step('Every color in the vector is listed here. Click one to change it, or leave it out.', () => h.point('#swatches'));
    await h.scroll('#mainPanel', 'start');
    await h.step('Download the SVG for websites, printing or cutting machines, copy its code, or save a big PNG.', () => h.point('#downloadBtn'));
    await h.sampleDownload('#downloadBtn', 'SVG made in this video');
  }
});

S('regex-forge.html', {
  title: 'Regex Forge', subtitle: 'Test, understand and write regular expressions',
  intro: 'Welcome to Regex Forge. Regular expressions find patterns in text, like dates, emails or prices. Here you can test them, understand them, and even have one written for you.',
  async run(h, page) {
    await h.step('Type a pattern, or start from a common one. Let us pick Price.', () => h.click('#lib-6'));
    await h.step('Every match in the test text lights up instantly, and the count is shown at the top.', () => h.point('#hl'));
    await h.step('What it means explains each part of the pattern in plain English, and Match details lists every match with its groups.', async () => { await h.scroll('#detailPanel', 'start'); await h.point('#explain'); await h.wait(600); await h.point('#table'); });
    await h.step('To find and replace, type a replacement. Here we move the amount in front of the currency.', async () => { await h.scroll('#testPanel', 'start'); await h.type('#replace', '$<amount> $<currency>'); await h.point('#replaced'); });
    await h.step('Do not know how to write it? Describe what you want, in any language, and press Write the regex for me.', async () => { await h.fill('#replace', ''); await h.fill('#text', ''); await h.scroll('#aiPanel', 'start'); await h.type('#describe', 'Swedish postal codes like 123 45 or 12345, but not longer numbers'); await h.click('#writeBtn'); });
    await h.skip('Skipping ahead while the AI writes the pattern', () => page.waitForSelector('#writeBtn:not([disabled])', { timeout: 120000 }));
    await h.step('The AI writes the pattern, explains it, and loads it with example text, so you can check the matches yourself.', () => h.point('#aiOut'));
    await h.step('Finally, copy ready code for JavaScript, Python, PHP, C sharp or Java.', async () => { await h.scroll('#codePanel', 'start'); await h.click('#lang-py'); });
    await h.sampleShot('#codePanel', 'Code made in this video');
  }
});

S('policy-forge.html', {
  title: 'Policy Forge', subtitle: 'Privacy policy, cookies and disclosures for your website',
  intro: 'Welcome to Policy Forge. Find out what your website must tell its visitors, and get the privacy policy, cookie policy and banner it needs.',
  async run(h, page) {
    await h.step('First, say who runs the site, how to reach you about privacy, and where you are based.', async () => { await h.type('#siteName', 'Sunrise Bakery'); await h.type('#owner', 'Sunrise Bakery AB'); await h.type('#email', 'privacy@sunrisebakery.com'); await h.select('#country', 'SE'); await h.select('#hosting', 'Cloudflare|Cloudflare, Inc.|USA'); });
    await h.step('Then open your website, press Control U to see its code, copy it and paste it here. We use an example bakery site.', async () => { await h.scroll('#scanPanel', 'start'); await h.click('#exampleBtn'); });
    await h.step('Policy Forge finds the services hidden in the code: Google Analytics, the Meta pixel, Stripe, YouTube, Google Maps and more.', () => h.point('#foundList'));
    await h.step('Tick what the code cannot show, such as visitors from California, or a newsletter tool.', async () => { await h.scroll('#aboutPanel', 'end'); await h.check('#v-ca'); });
    await h.step('What you need lists what the law asks of this site, from a cookie banner to self-hosted fonts and a Do not sell link.', async () => { await h.scroll('#resultPanel', 'start'); await h.point('#doc'); });
    await h.step('The privacy policy is written from your answers: what you collect, why, who receives it, and the visitor’s rights.', async () => { await h.click('#tab-privacy'); await page.locator('#doc').evaluate(e => e.scrollTo({ top: 420, behavior: 'smooth' })); await h.wait(800); });
    await h.step('The cookie policy lists every cookie with who sets it and how long it lasts.', () => h.click('#tab-cookies'));
    await h.step('Cookie banner gives you ready code that blocks tracking until the visitor says yes, with Reject as easy as Accept.', () => h.click('#tab-banner'));
    await h.step('There are also terms of use, and disclosures for affiliate links, AI, an Impressum or an accessibility statement.', () => h.click('#tab-disc'));
    await h.step('Copy any document, or download it as a ready web page. Remember, it is a starting point, not legal advice.', async () => { await h.click('#tab-privacy'); await h.point('#dlHtml'); });
    await h.sampleDownload('#dlHtml', 'Privacy policy made in this video');
  }
});

S('focus-forge.html', {
  title: 'Focus Forge', subtitle: 'A Pomodoro focus timer',
  intro: 'Welcome to Focus Forge. Work in focused sessions with short breaks, and watch your focus time add up.',
  async run(h, page) {
    await h.step('First, write what you want to get done, guess how many sessions it needs, and press Add.', async () => { await h.type('#taskName', 'Finish the history essay'); await h.fill('#taskEst', '3'); await h.click('#taskAddBtn'); });
    await h.step('Pick a session length. Twenty five minutes of focus and a five minute break is the classic Pomodoro.', async () => { await h.scroll('#settingsPanel', 'start'); await h.click('#preset-0'); });
    await h.step('Choose a calm background sound. Rain and noise are made on your device, nothing is streamed.', async () => { await h.click('#sound-rain'); await h.point('#vol'); });
    await h.step('Press Start. The ring counts down, and the tab title shows the time left, even in another tab.', async () => { await h.scroll('#timerPanel', 'start'); await h.click('#startBtn'); await h.wait(1500); });
    await h.skip('Skipping ahead to the end of the session', () => page.evaluate(() => { const real = Date.now.bind(Date), jump = 25 * 60 * 1000; Date.now = () => real() + jump; }));
    await h.wait(800);
    await h.step('When the session ends you hear a chime, the session is counted on your task, and your break begins.', () => h.point('#tasks'));
    await h.step('Your focus minutes, sessions and day streak are saved only in this browser, with a chart of the last seven days.', () => h.scroll('#statsPanel', 'start'));
    await h.sampleShot('#statsPanel', 'Focus stats from this video');
    await h.step('Below are tips for focusing better, and how to use your sessions for studying.', () => h.scrollBy(500));
  }
});

S('memory-forge.html', {
  title: 'Memory Forge', subtitle: 'Memory training with levels, cards and a clock',
  intro: 'Welcome to Memory Forge. Train your memory with number and symbol cards and other games, level by level.',
  async run(h, page) {
    const answer = async () => {
      const ids = await page.evaluate(() => (window.__memSeq || []).map(v => { const b = [...document.querySelectorAll('#palette button')].find(x => x.textContent === v); return b ? '#' + b.id : null; }));
      for (const id of ids) if (id) await h.click(id);
    };
    const remember = () => page.evaluate(() => { window.__memSeq = [...document.querySelectorAll('#studyCards .mcard span:not(.ix)')].map(s => s.textContent); });
    await h.step('Choose a game. Number cards, symbol cards, a mix of both, the chimp test, pairs, n-back, sequences and word lists each train a different kind of memory.', () => h.point('#modes'));
    await h.step('Pick Number cards, then choose with or without a clock. Without a clock you can look at the cards for as long as you like.', async () => { await h.click('#mode-numbers'); await h.click('#timedOff'); });
    await h.step('There are thirty levels. Each one adds cards and takes away time, and passing a level unlocks the next.', () => h.point('#levels'));
    await h.step('Press Start and memorise the cards from left to right.', async () => { await h.click('#startBtn'); await remember(); });
    await h.step('When you are ready, press I have memorised them, and put the cards back in order with the keypad.', async () => { await h.click('#readyBtn'); await answer(); });
    await h.step('Check shows which cards were right, your stars, and a button for the next level.', () => h.click('#checkBtn'));
    await h.step('In Custom you decide how many numbers and how many symbols there are, how long each card is shown, and how long you have to answer.', async () => {
      await h.click('#tabCustom'); await h.click('#mode-mixed'); await h.click('#timedOn');
      await h.fill('#c_numCount', '4'); await h.fill('#c_symCount', '3'); await h.fill('#c_studySec', '1.5'); await h.fill('#c_recallSec', '60');
    });
    await h.step('With the clock on, the cards hide by themselves when the time bar runs out.', async () => { await h.click('#startBtn'); await remember(); });
    await h.skip('Skipping ahead to the answer', () => page.waitForSelector('#palette', { timeout: 30000 }));
    await h.step('Now tap the numbers and symbols in the right order before the answer clock runs out.', answer);
    await h.step('Every card is checked, and your result is added to your progress.', () => h.click('#checkBtn'));
    await h.sampleShot('#playPanel', 'Memory game result from this video');
    await h.step('Your levels, day streak and a chart of your games are saved only in this browser.', () => h.scroll('#stats', 'center'));
    await h.step('Below them is a guide to the techniques memory champions use: the memory palace, stories, pegs, the Major system, names and faces, and a four week plan to master them.', () => h.scroll('#techniques', 'start'));
    await h.step('Practise with the trainers. Write the spots of a route you know, press Random words and Place them, then picture each word at its spot.', async () => { await h.scroll('#palaceTrainer', 'start'); await h.click('#palRandom'); await h.click('#palPlace'); });
    await h.step('The Major system trainer turns any number into picture words, and the review planner puts your next reviews in your calendar.', async () => { await h.scroll('#majorTrainer', 'start'); await h.fill('#majNum', '31415926'); });
  }
});

S('flashcard-forge.html', {
  title: 'Flashcard Forge', subtitle: 'Remember anything with spaced repetition',
  intro: 'Welcome to Flashcard Forge. Make flashcards in seconds and remember them for good.',
  async run(h) {
    await h.step('Create a deck. You can type cards, paste a list, or let the AI write them from your notes.', () => h.click('#newDeck'));
    await h.step('Here we paste a list of Swahili words, one card per line.', async () => { await h.click('[data-tab=edit]'); await h.click('summary:has-text("Paste many")'); await h.type('#bulk', 'habari - hello\nasante - thank you\nkaribu - welcome\nrafiki - friend\nchakula - food\nmaji - water', { visible: 40 }); await h.click('#bulkAdd'); });
    await h.step('Now study. Tap the card to see the answer.', async () => { await h.click('[data-tab=study]'); await h.click('#flash'); });
    await h.step('Then say how well you remembered it. Cards you know come back later, and cards you forget come back sooner.', () => h.click('[data-g="2"]'));
    await h.step('Test yourself with multiple choice or typed answers, and export your deck to Anki, Quizlet or Excel.', async () => { await h.click('[data-tab=test]'); await h.click('#mcTest'); });
    await h.click('[data-tab=share]');
    await h.sampleDownload('#expCsv', 'Deck made in this video (CSV)');
  }
});

S('audio-forge.html', {
  title: 'Audio Forge', subtitle: 'Trim, fade and convert audio privately',
  intro: 'Welcome to Audio Forge. Edit audio right in your browser. Your files never leave your device.',
  async run(h, page) {
    await h.step('Open an audio or video file, or record from your microphone. Here we open a podcast intro.', () => h.upload('#file', 'voice.wav'));
    await page.waitForSelector('#editor:not(.hidden)');
    await h.step('Drag across the waveform to select a part. Let us cut off the “umm” at the start.', async () => {
      const b = await page.locator('#wave').boundingBox(); await h.point('#wave');
      await page.mouse.move(b.x + b.width * 0.13, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.99, b.y + b.height / 2, { steps: 20 }); await page.mouse.up();
    });
    await h.step('Press Keep selection to trim everything else away.', () => h.click('#trim'));
    await h.step('Add a fade in and a fade out, and make the voice as loud as possible with Normalise.', async () => { await h.click('#fadeIn'); await h.click('#fadeOut'); await h.click('#normalize'); });
    await h.step('Finally choose MP3 or WAV, and download.', () => h.point('#export'));
    await h.sampleDownload('#export', 'Edited audio from this video');
  }
});

// ---------------------------------------------------------------- AI generators
const enabled = sel => sel + ':not([disabled])';
async function saveFrameHtml(h, page, frameSel, label) {
  const html = await page.locator(frameSel).evaluate(f => f.srcdoc || (f.contentDocument && f.contentDocument.documentElement.outerHTML) || '');
  if (html && html.length > 200) await h.sampleFile(html.startsWith('<!') ? html : '<!doctype html>' + html, '.html', label);
}

S('website-builder.html', {
  title: 'Website Builder', subtitle: 'A complete multi-page website from one brief',
  intro: 'Welcome to Website Builder. Describe your business, and get a complete multi page website you can publish.',
  async run(h, page) {
    await h.step('Describe the business in a few sentences: what you sell, who your customers are, and the feeling you want.', () => h.type('#brief', 'Sunrise Bakery is a warm neighbourhood bakery in Nairobi. We bake sourdough, rye and seeded bread every morning with local flour, and sell cakes and good coffee. Our customers are families and office workers. Style: friendly, fresh and golden.', { visible: 110 }));
    await h.step('Add your contact details so the site is ready to use.', async () => { await h.type('#bizName', 'Sunrise Bakery'); await h.type('#bizPhone', '+254 700 123 456'); });
    await h.step('Choose pictures and features such as a booking form, then press Draft the site.', async () => { await h.point('input[name=imageMode][value=stock]'); await h.click('#draftBtn'); });
    await h.skip('Skipping ahead while the AI designs every page', () => page.waitForSelector(enabled('#downloadBtn'), { timeout: 400000 }));
    await h.step('Here is your website. Look through every page in the preview.', () => h.scroll('#preview', 'center'));
    await h.step('Want a change? Type it in plain words, like add a photo gallery, and press Apply change.', () => h.point('#refineInput'));
    await h.step('When you are happy, download all the pages, or publish them straight to free hosting.', () => h.point('#downloadBtn'));
    await saveFrameHtml(h, page, '#preview', 'Website made in this video');
  }
});

S('game-forge.html', {
  title: 'Game Forge', subtitle: 'Turn an idea into a playable game',
  intro: 'Welcome to Game Forge. Describe a game, and play it in your browser a minute later.',
  async run(h, page) {
    await h.step('Describe the game you want: the hero, the goal, the controls and the style.', () => h.type('#brief', 'A cheerful platformer where a little baker jumps across floating cakes to collect golden croissants and avoid angry wasps. Arrow keys to move and space to jump. Three levels that get faster.', { visible: 100 }));
    await h.step('Pick a genre and the features you want, like sound effects and touch controls for phones. Then press Generate game.', async () => { await h.select('#genre', 'platformer'); await h.click('#draftBtn'); });
    await h.skip('Skipping ahead while the AI builds the game', () => page.waitForSelector(enabled('#downloadBtn'), { timeout: 400000 }));
    await h.step('Your game is ready. Press start and play it right here.', async () => {
      await h.scroll('#preview', 'center');
      const game = page.frameLocator('#preview');
      const start = game.locator('button, [role=button], .btn').filter({ hasText: /start|play|begin/i }).first();
      if (await start.count().catch(() => 0)) { const fb = await page.locator('#preview').boundingBox(), bb = await start.boundingBox(); if (bb) await page.evaluate(([x, y]) => { window.__tv.cursor(x, y); window.__tv.click(x, y); }, [bb.x + bb.width / 2, bb.y + bb.height / 2]); await start.click({ timeout: 5000 }).catch(() => {}); }
      else await h.click('#preview');
      await page.locator('#preview').focus().catch(() => {});
    });
    await h.step('Use the arrow keys to move and the space bar to jump. Collect the croissants and dodge the wasps.', async () => {
      const frame = page.frame({ url: /about:srcdoc/ }) || page.mainFrame();
      for (const k of ['ArrowRight', 'Space', 'ArrowRight', 'ArrowRight', 'Space', 'ArrowRight', 'ArrowLeft', 'Space', 'ArrowRight']) { await page.keyboard.down(k); await h.wait(420); await page.keyboard.up(k); await h.wait(120); }
    });
    await h.step('To change it, type a request like make it harder, or use the quick buttons. Then download the finished game.', () => h.point('#refineInput'));
    await h.sampleDownload('#downloadBtn', 'Game made in this video');
  }
});

S('3d-game-forge.html', {
  title: '3D Game Forge', subtitle: 'Make a 3D game from one sentence',
  intro: 'Welcome to 3D Game Forge. Describe a 3D game, play it straight away, then change anything you like.',
  async run(h, page) {
    const hold = async (key, ms) => { await page.keyboard.down(key); await h.wait(ms); await page.keyboard.up(key); };
    const play = async () => { await h.click('#stage button', { force: true }); await h.wait(400); };
    await h.step('Describe the game you want in one sentence. Here, a fox collects gems in a snowy forest at night while ghosts chase it.', () => h.fill('#prompt', 'A fox collects glowing gems in a snowy forest at night while friendly ghosts chase it'));
    await h.step('Press Make my 3D game. The AI picks the kind of game, the world, the hero, the enemies and the rules.', () => h.click('#makeBtn'));
    await h.skip('Skipping ahead while the AI designs the game', () => page.waitForFunction(() => /ready|Could not|did not/.test(document.querySelector('#status').textContent), null, { timeout: 180000 }));
    await h.step('Press Play. The arrow keys or W A S D move, Space jumps, and on a phone you get buttons on the screen.', async () => { await play(); await hold('w', 1800); await hold('a', 500); await hold('w', 1500); });
    await h.step('Or start from a template. The endless runner has three lanes: jump the hurdles and dodge the walls.', async () => { await h.click('#tpl-runner'); await play(); await hold('ArrowLeft', 150); await h.wait(1200); await hold(' ', 200); await h.wait(1500); await hold('ArrowRight', 150); await h.wait(1200); });
    await h.step('The kart racer has rivals, laps and boost stars. There are also a first-person maze, a platformer and an arena.', async () => { await h.click('#tpl-racer'); await play(); await hold('ArrowUp', 4500); });
    await h.step('Change the world, the time of day, the hero and the enemies from the menus, and tune speed, jumping and enemies with sliders.', async () => { await h.click('#tpl-explore'); await h.select('#f_env', 'candy'); await h.select('#f_player', 'ball'); await h.select('#f_enemy', 'ghost'); });
    await h.step('Paint your own level: pick a tile such as a wall, then click or drag on the grid. The game restarts with your level.', async () => {
      await h.click('#tile-5'); const g = await page.locator('#grid').boundingBox();
      await page.mouse.move(g.x + g.width * 0.2, g.y + g.height * 0.35); await page.mouse.down(); await page.mouse.move(g.x + g.width * 0.7, g.y + g.height * 0.35, { steps: 12 }); await page.mouse.up(); await h.wait(800);
    });
    await h.scroll('#stage', 'center');
    await h.step('Copy a share link that holds the whole game, or download it as one HTML file that works on any website.', () => h.point('#shareBtn'));
    await h.sampleDownload('#dlBtn', '3D game made in this video');
  }
});

S('app-forge.html', {
  title: 'App Forge', subtitle: 'Build a small app that works on any phone',
  intro: 'Welcome to App Forge. Describe an app, and get it built as an app people can install on their phone.',
  async run(h, page) {
    await h.step('Choose what you want to build. Here we make an installable web app.', () => h.click('#modeWebBtn'));
    await h.step('Give it a name and describe what it should do.', async () => { await h.type('#appName', 'Bake Timer'); await h.type('#appBrief', 'A kitchen timer app for bakers with three named timers running at once, big buttons, a loud alarm and a list of favourite bake times that is remembered between visits.', { visible: 90 }); });
    await h.step('Pick a theme colour, then press Generate app.', () => h.click('#generateBtn'));
    await h.skip('Skipping ahead while the AI builds the app', () => page.waitForSelector(enabled('#downloadBtn'), { timeout: 400000 }));
    await h.step('The app runs in the preview. Try it out, and ask for changes in plain words.', () => h.scroll('#previewFrame', 'center'));
    await h.step('Download it as a zip, ready to put online or install.', () => h.point('#downloadBtn'));
    await saveFrameHtml(h, page, '#previewFrame', 'App made in this video');
  }
});

S('cartoon-forge.html', {
  title: 'Cartoon Forge', subtitle: 'An animated story from your idea',
  intro: 'Welcome to Cartoon Forge. Describe a story, and watch it come to life as an animated cartoon.',
  async run(h, page) {
    await h.step('Choose a style, the length, the format and who it is for.', async () => { await h.select('#duration', '30'); await h.point('#style'); });
    await h.step('Describe the characters, the setting and what happens.', () => h.type('#brief', 'A small orange cat named Mimi wants to reach the moon. She builds a cardboard rocket with her friend, a clever blue bird, counts down from three and flies past the stars, then waves at the moon and comes home for dinner.', { visible: 100 }));
    await h.step('Press Generate cartoon.', () => h.click('#generateBtn'));
    await h.skip('Skipping ahead while the AI animates the cartoon', () => page.waitForSelector(enabled('#downloadBtn'), { timeout: 400000 }));
    await h.step('Here is the cartoon, with captions and narration. Press Replay to watch it again.', () => h.scroll('#preview', 'center'));
    await h.wait(6000);
    await h.step('Refine any scene in plain words, then record it as a video or download it.', () => h.point('#saveVideoBtn'));
    await h.sampleDownload('#downloadBtn', 'Cartoon made in this video');
  }
});

S('logo-forge.html', {
  title: 'Logo Forge', subtitle: 'A logo, favicon and brand kit',
  intro: 'Welcome to Logo Forge. Describe your business, and get a logo and a brand kit.',
  async run(h, page) {
    await h.step('Describe the business and the feeling you want, and add its name.', async () => { await h.type('#brief', 'A warm neighbourhood bakery that bakes fresh sourdough every morning. Friendly, golden and simple.', { visible: 70 }); await h.type('#bizName', 'Sunrise Bakery'); });
    await h.step('Press Generate a logo and brand kit.', () => h.click('#brandKitBtn'));
    await h.skip('Skipping ahead while the AI designs the logo', () => page.waitForSelector('#resultCard:visible', { timeout: 300000 }));
    await h.step('Here is your logo with colours, fonts and a small icon for your website tab.', () => h.scroll('#resultCard', 'center'));
    await h.sampleShot('#resultCard', 'Logo made in this video');
    await h.step('Download the files you need: the logo, the favicon and the brand kit.', () => h.point('#resultCard button >> nth=0'));
  }
});

S('slide-forge.html', {
  title: 'Slide Forge', subtitle: 'A PowerPoint presentation from a brief',
  intro: 'Welcome to Slide Forge. Describe a presentation, and download it as a PowerPoint file.',
  async run(h, page) {
    await h.step('Describe the presentation: the topic, the audience and the goal.', () => h.type('#pptxBrief', 'A short pitch to local offices about Sunrise Bakery’s new breakfast delivery: fresh bread, pastries and coffee delivered by 8 am, with weekly plans and a free trial week.', { visible: 90 }));
    await h.step('Choose how many slides and a colour theme. Then press Plan slides with AI.', async () => { await h.fill('#slideCountInput', '6'); await h.click('#planBtn'); });
    await h.skip('Skipping ahead while the AI plans the slides', () => page.waitForFunction(() => document.querySelectorAll('#slidesList > *').length > 2, null, { timeout: 300000 }));
    await h.step('Every slide appears here. Edit the titles and points, reorder them, or add photos.', () => h.scroll('#slidesList', 'start'));
    await h.step('Press Build and download to get your PowerPoint file.', () => h.point('#buildBtn'));
    await h.sampleDownload('#buildBtn', 'Presentation made in this video');
  }
});

S('bot-forge.html', {
  title: 'Bot Forge', subtitle: 'A chat helper for your website',
  intro: 'Welcome to Bot Forge. It makes a chat helper that answers your customers’ questions on your website.',
  async run(h, page) {
    // The widget calls Gemini with the site owner's key. For the video, a placeholder key is used and the
    // widget's requests are answered through MigaBuilder's own Gemini proxy.
    await h.ctx.route(/generativelanguage\.googleapis\.com/, async route => {
      try {
        const b = JSON.parse(route.request().postData() || '{}');
        const sys = ((b.systemInstruction || b.system_instruction || {}).parts || []).map(x => x.text).join('\n');
        const convo = (b.contents || []).map(c => (c.role === 'model' ? 'Assistant: ' : 'Visitor: ') + (c.parts || []).map(x => x.text).join(' ')).join('\n');
        const r = await fetch('https://migabuilder-gemini.makmurphy69.workers.dev', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://migabuilder.com' }, body: JSON.stringify({ model: 'gemini-3.5-flash', systemPrompt: sys, userPrompt: convo + '\nAssistant:' }) });
        route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: await r.text() });
      } catch (e) { console.log('   bot route error:', e.message); route.fulfill({ status: 500, body: '{}' }); }
    });
    await h.step('Enter your business name and a short description.', async () => { await h.type('#bizName', 'Sunrise Bakery'); await h.type('#bizDesc', 'Neighbourhood bakery in Nairobi with fresh bread, cakes and coffee.', { visible: 40 }); });
    await h.step('The bot runs on your own website, so it uses your own free Gemini key. Paste it here. In this video we use a demo key.', () => h.type('#apiKey', 'DEMO-KEY-FOR-THIS-VIDEO', { visible: 23 }));
    await h.step('Now the important part: everything the bot should know, like opening hours, prices and delivery.', () => h.type('#knowledge', 'Open Monday to Saturday 7:00 to 18:00, Sunday 8:00 to 14:00. Sourdough 350 KES, carrot cake 450 KES a slice. Free delivery within 3 km for orders over 1,000 KES. Children’s baking class on Saturdays at 10:00.', { visible: 90 }));
    await h.step('Set a welcome message and a colour, then press Build widget preview.', async () => { await h.type('#welcomeMsg', 'Hi! Ask me about our bread, hours or delivery.'); await h.click('#buildBtn'); });
    const frame = () => page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:blank') || page.frames()[1];
    await h.step('Test it like a customer would. Open the chat and ask a question.', async () => {
      const f = frame(); await f.locator('button').last().click(); await h.wait(700);
      const input = f.locator('input, textarea').first(); await input.pressSequentially('Do you deliver, and when do you open on Sunday?', { delay: 30 }); await input.press('Enter');
    });
    await h.skip('Waiting for the bot to answer', () => page.waitForFunction(() => { const fr = [...document.querySelectorAll('iframe')].map(i => i.contentDocument).filter(Boolean); return fr.some(d => { const after = (d.body.innerText.split('open on Sunday?')[1] || '').replace(/…|Send|Type a message/g, '').trim(); return after.length > 25; }); }, null, { timeout: 120000 }).catch(() => {}));
    await h.step('The bot answers from your information only. When you are happy, copy the embed code into your website.', () => h.point('#copyBtn'));
    const file = await h.sampleDownload('#downloadBtn', 'Chat widget made in this video');
    const fs = await import('node:fs'); fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('DEMO-KEY-FOR-THIS-VIDEO', 'YOUR-GEMINI-API-KEY'));
  }
});

S('code-forge.html', {
  title: 'Code Forge', subtitle: 'Learn Python and JavaScript step by step',
  intro: 'Welcome to Code Forge. Learn to code in Python or JavaScript, one small lesson at a time.',
  async run(h, page) {
    await h.step('Choose Python or JavaScript, and start with the first lesson.', () => h.click('#langPython'));
    await h.step('Each lesson explains one idea, and gives you a small task. Write your code in the editor.', () => h.point('#codeEditor'));
    await h.step('Press Run and check. You see the output, and whether you solved the task.', () => h.click('#runBtn'));
    await h.skip('Starting Python in the browser', () => page.waitForSelector('#resultBanner:visible, #outputPre:not(:empty)', { timeout: 120000 }).catch(() => {}));
    await h.step('Stuck? Use a hint, or ask the AI to explain your code in simple words.', () => h.point('#hintBtn'));
    await h.sampleShot('main', 'Lesson from this video');
  }
});

// ---------------------------------------------------------------- images & design
S('file-forge.html', {
  title: 'Image Forge', subtitle: 'Convert, resize and compress images',
  intro: 'Welcome to Image Forge. Convert, resize and compress many images at once, privately.',
  async run(h) {
    await h.step('Choose your images, or drag them onto the page. Here is a large landscape photo.', () => h.upload('#fileInput', 'landscape.jpg'));
    await h.step('Pick the new format. WebP makes much smaller files for websites.', () => h.select('#formatSelect', 'image/webp'));
    await h.step('Set the quality, and a maximum size if you want to shrink the image.', async () => { await h.point('#qualitySlider'); await h.select('#maxDimension', '1280'); });
    await h.page.locator('#zipOutput').setChecked(false).catch(() => {});
    await h.step('Press Convert and download. Location data and other hidden details are removed too.', () => h.point('#convertBtn'));
    await h.sampleDownload('#convertBtn', 'Converted image from this video');
  }
});

S('background-forge.html', {
  title: 'Background Forge', subtitle: 'Remove image backgrounds privately',
  intro: 'Welcome to Background Forge. It removes the background from a picture, right in your browser.',
  async run(h) {
    await h.step('Choose an image with a clear subject.', () => h.upload('#photo', 'portrait.png'));
    await h.step('Adjust the removal strength if you need to, then press Remove background.', async () => { await h.point('#tolerance'); await h.click('#remove'); });
    await h.wait(1500);
    await h.step('The background is now transparent. Check the edges, and download the PNG.', () => h.point('#download'));
    await h.sampleDownload('#download', 'Cut-out made in this video');
  }
});

S('image-studio.html', {
  title: 'Image Studio', subtitle: 'Backgrounds, collages, memes and thumbnails',
  intro: 'Welcome to Image Studio. Change backgrounds, and make collages, memes and thumbnails.',
  async run(h) {
    await h.step('Choose a picture. Then choose how to find the background, and what to do with it.', async () => { await h.upload('#images', 'portrait.png'); await h.select('#bgMethod', 'colour'); });
    await h.step('Here we replace the background with a warm colour.', async () => { await h.select('#bgAction', 'replace'); await h.page.locator('#replaceColor').evaluate(e => { e.value = '#f4b860'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }); await h.click('#applyBackground'); });
    await h.wait(1500);
    await h.step('The other tabs make collages, memes, YouTube thumbnails and sharper, upscaled pictures.', () => h.point('button:has-text("Meme")'));
    await h.step('Download the finished picture.', () => h.point('#download'));
    await h.sampleDownload('#download', 'Picture made in this video');
  }
});

S('picture-forge.html', {
  title: 'Picture Forge', subtitle: 'Turn words into an original picture',
  intro: 'Welcome to Picture Forge. Describe any picture, pick a look and a shape, and Google Gemini paints it for you. Then change it with plain words.',
  async run(h, page) {
    await h.step('Step one: describe your picture. Say what is in it, where it is, and the mood. Short idea? Improve my words writes a fuller description for you.', async () => { await h.type('#prompt', 'A tiny red cottage beside a frozen lake at blue hour, warm golden light in the windows, snowy pine trees reflected in the ice.', { visible: 60 }); await h.point('#improveBtn'); });
    await h.step('Step two: pick a look, like photo, watercolour, storybook, anime or 3D clay.', () => h.click('#styles .chip:nth-child(4)'));
    await h.step('Step three: pick a shape. Square for posts, Story for phones, Wide for screens and videos.', () => h.click('#shapes .chip:nth-child(8)'));
    await h.step('You can also add your own photos, to edit them or to keep the same person, pet or product in a new scene.', () => h.point('#drop'));
    await h.step('More options holds the size, the AI model, framing, light, colours, and how many versions to make.', async () => { await h.click('#more summary'); await h.point('#quality'); });
    await h.step('Step four: choose who makes the picture. The shared AI needs no setup. With your own Gemini key from Google AI Studio you get every size and several versions.', async () => { await h.click('#more summary'); await h.click('input[name=who][value=own]'); await h.point('#keyBox a'); });
    await h.step('Paste the key here and press Test. The key goes straight from your browser to Google, never to MigaBuilder. The full step by step guide is at the bottom of the page.', async () => { await h.point('#apiKey'); await h.click('input[name=who][value=shared]'); });
    await h.step('Now press Make my picture. For this walkthrough we show a sample, so no AI credit is spent.', async () => { await h.point('#generateBtn'); await page.evaluate(() => window.pictureForgeDemo()); });
    await h.wait(800);
    await h.step('Here is your picture. Not quite right? Tell it what to change, and everything else stays the same.', async () => { await h.point('#result'); await h.type('#changeText', 'make it night with stars'); });
    await h.step('Press Change it.', async () => { await h.point('#changeBtn'); await page.evaluate(() => window.pictureForgeDemo('night')); });
    await h.wait(900);
    await h.step('Pick PNG, JPG or WebP, and press Download. Copy puts it on your clipboard, and Edit in Image Studio adds text, memes or a new background.', () => h.select('#format', 'png'));
    await h.sampleDownload('#downloadBtn', 'Picture made in this video');
    await h.step('Every picture you make is kept under Your recent pictures, only in this browser.', () => h.point('#galleryWrap'));
    await h.step('And the help section explains how to get your own Gemini key, how downloading works, and what pictures cost.', async () => { await h.click('#keyGuide summary'); await h.point('#keyGuide .big-link'); });
  }
});

S('design-forge.html', {
  title: 'Design Forge', subtitle: 'Thumbnails, memes and collages',
  intro: 'Welcome to Design Forge. Make thumbnails, social posts and collages in seconds.',
  async run(h) {
    await h.step('Choose the size, for example a YouTube thumbnail.', () => h.select('#preset', '1280,720'));
    await h.step('Add up to nine images and a headline.', async () => { await h.upload('#images', ['drawing-house.png', 'drawing-rocket.png', 'drawing-cat.png']); await h.type('#headline', 'Our art week!'); });
    await h.step('Pick a layout and a text colour, then press Create design.', async () => { await h.select('#layout', 'grid'); await h.click('#render'); });
    await h.step('Download your design as a picture.', () => h.point('#save'));
    await h.sampleDownload('#save', 'Design made in this video');
  }
});

S('paint-forge.html', {
  title: 'Paint Forge', subtitle: 'Edit images with layers',
  intro: 'Welcome to Paint Forge. A layered image editor that runs in your browser.',
  async run(h, page) {
    const canvas = async () => { const hs = await page.locator('canvas').evaluateAll(cs => cs.map((c, i) => { const r = c.getBoundingClientRect(); return [r.width * r.height, i]; })); hs.sort((a, b) => b[0] - a[0]); return page.locator('canvas').nth(hs[0][1]); };
    const draw = async (pts) => { const c = await canvas(); const b = await c.boundingBox(); await page.mouse.move(b.x + b.width * pts[0][0], b.y + b.height * pts[0][1]); await page.mouse.down(); for (const [x, y] of pts.slice(1)) await page.mouse.move(b.x + b.width * x, b.y + b.height * y, { steps: 12 }); await page.mouse.up(); };
    await h.step('Pick a tool from the toolbar. Let us draw a rectangle.', async () => { await h.click('button:has-text("Rectangle")'); await draw([[0.2, 0.25], [0.55, 0.6]]); });
    await h.step('Now an ellipse, and some free drawing with the brush.', async () => { await h.click('button:has-text("Ellipse")'); await draw([[0.5, 0.35], [0.8, 0.75]]); await h.click('button:has-text("Brush")'); await draw([[0.15, 0.8], [0.3, 0.7], [0.45, 0.82], [0.6, 0.7], [0.75, 0.82]]); });
    await h.step('Work with layers, import photos, and adjust brightness, contrast and colours.', () => h.point('#brightnessSlider'));
    await h.step('When you are finished, export your picture as PNG or JPG.', () => h.point('#exportPngBtn'));
    await h.sampleDownload('#exportPngBtn', 'Picture made in this video');
  }
});

S('model-forge.html', {
  title: 'Model Forge', subtitle: 'Design 3D models for printing',
  intro: 'Welcome to Model Forge. Design simple 3D models, ready for a 3D printer.',
  async run(h) {
    await h.step('Add shapes: a box, a cylinder, a sphere or a cone.', async () => { await h.click('#addBoxBtn'); await h.click('#addCylinderBtn'); });
    await h.step('Combine them. Subtract cuts one shape out of another, like drilling a hole.', async () => { await h.point('#boolAInput'); await h.click('#subtractBtn'); });
    await h.step('Turn the model around to look at it from every side.', () => h.click('#wireframeBtn'));
    await h.click('#wireframeBtn');
    await h.sampleShot('canvas', 'Model made in this video');
    await h.step('Export it as an STL or OBJ file for your 3D printer.', () => h.point('#exportStlBtn'));
  }
});

S('boat-forge.html', {
  title: 'Boat Forge', subtitle: 'Design a boat and see it float',
  intro: 'Welcome to Boat Forge. Design a boat hull, see it float in 3D, and get the plans to build it.',
  async run(h, page) {
    const slide = async (sel, v) => { await h.point(sel); await page.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, String(v)); await h.wait(500); };
    await h.step('Start from a boat: a dinghy, skiff, runabout, dory, canoe, kayak, sailboat, catamaran, pontoon or trawler. Here we pick a flat-bottom skiff.', async () => { await h.point('#presets'); await h.click('#preset-skiff'); });
    await h.step('Shape it with the sliders. We make it a little longer and wider.', async () => { await slide('#p_L', 5.4); await slide('#p_B', 1.9); });
    await h.step('Deadrise gives the bottom a V, and flare makes the sides lean out.', async () => { await slide('#p_deadT', 10); await slide('#p_flare', 20); });
    await h.step('Add people and a bigger engine. The boat sinks until it displaces its own weight of water, then trims until it balances.', async () => { await slide('#p_crew', 3); await slide('#p_hp', 25); });
    await h.step('Try the heel test to see how hard the boat pushes itself back upright.', async () => { await h.scroll('.viewtabs', 'start'); await slide('#heel', 25); });
    await h.step('Below the 3D view you get the weight, draft, freeboard, stability and estimated speed, with checks written in plain language.', () => h.scroll('#hydro', 'center'));
    await h.scroll('.viewtabs', 'start');
    await h.step('The lines plan draws the profile, the half-breadth plan and the body plan, ready to download for CAD.', () => h.click('#tabLines'));
    await h.step('The stability curve shows the righting arm at every angle of heel.', () => h.click('#tabStab'));
    await h.step('For plywood boats, the panels are unrolled flat so you can cut them from sheets, with station molds and a material list.', () => h.click('#tabPanels'));
    await h.sampleShot('#panelsBox', 'Plywood panels made in this video');
    await h.step('Download the panels full size as a DXF file for cutting, and the lines, offsets, 3D model and a printable build sheet from the other tabs.', () => h.point('#dlPanelsDXF'));
  }
});

S('cad-forge.html', {
  title: 'CAD Forge', subtitle: 'Design a house: plans, 3D model and materials',
  intro: 'Welcome to CAD Forge. Draw a floor plan and get a 3D house, drawings and a material list.',
  async run(h) {
    await h.step('Draw walls, doors and windows on the plan, or start from the sample house.', () => h.click('#sampleBtn'));
    await h.step('Rooms are found automatically, with their areas.', () => h.click('button:has-text("Split")'));
    await h.step('The 3D model builds itself, with the roof you choose.', async () => { await h.click('button:has-text("3D")'); await h.select('#roofType', 'hip'); });
    await h.step('Open the drawings for a plan and elevations at a proper scale.', () => h.click('button:has-text("Drawings")'));
    await h.step('The material list counts the timber, boards, roof and windows you need.', () => h.click('button:has-text("Material list")'));
    await h.click('button:has-text("Model")');
    await h.step('Export the floor plan for other CAD programs, or the 3D model and a picture.', () => h.point('#dxfBtn'));
    await h.sampleDownload('#pngBtn', '3D house made in this video');
  }
});

// ---------------------------------------------------------------- documents & PDFs
S('document-forge.html', {
  title: 'Document Forge', subtitle: 'Convert documents privately',
  intro: 'Welcome to Document Forge. Convert documents, images and PDFs without uploading them anywhere.',
  async run(h, page) {
    await h.step('Drop in a file: a Word document, text, Markdown, a web page, a photo or a PDF. Here is a bakery menu written as a simple text file.', () => h.upload('#file', 'menu.md'));
    await page.waitForFunction(() => document.querySelector('#output').options.length > 1, null, { timeout: 30000 });
    await h.step('Choose the format you need. Let us turn it into a neat PDF document.', () => h.select('#output', 'pdf'));
    await h.step('Check the preview, then press Convert and download.', () => h.point('#convert'));
    await h.sampleDownload('#convert', 'PDF made in this video');
  }
});

S('pdf-forge.html', {
  title: 'PDF Forge', subtitle: 'Merge, split, number and watermark PDFs',
  intro: 'Welcome to PDF Forge. Merge, split, reorder and watermark PDFs in your browser.',
  async run(h) {
    await h.step('Choose one or more PDF files. We add a rental agreement and a bakery menu.', () => h.upload('#files', ['rental-agreement.pdf', 'brochure.pdf']));
    await h.step('Optionally pick the pages to keep, rotate them, or add a footer.', () => h.point('#pages'));
    await h.step('Add a watermark and page numbers.', async () => { await h.type('#watermark', 'COPY'); await h.check('#numbers'); });
    await h.step('Press Create PDF to download one combined file.', () => h.point('#merge'));
    await h.sampleDownload('#merge', 'PDF made in this video');
  }
});

S('pdf-compress.html', {
  title: 'Compress PDF', subtitle: 'Make PDFs smaller for email',
  intro: 'Welcome to Compress PDF. It makes a PDF smaller, so it fits email and upload limits.',
  async run(h) {
    await h.step('Choose the PDF you want to shrink. Here is a class booklet full of big pictures.', () => h.upload('#file', 'art-week.pdf'));
    await h.step('Pick a compression level. Stronger compression means a smaller file.', () => h.point('input[type=radio] >> nth=1'));
    await h.step('Press Compress PDF.', () => h.click('#go'));
    await h.skip('Skipping ahead while the PDF is compressed', () => h.page.waitForSelector('#dl:visible', { timeout: 120000 }));
    await h.step('Compare the old and new sizes, then download the smaller copy.', () => h.point('#result'));
    await h.sampleDownload('#dl', 'Compressed PDF from this video');
  }
});

S('pdf-edit-forge.html', {
  title: 'Sign Documents', subtitle: 'Sign PDFs, Word files and photos',
  intro: 'Welcome to Sign Documents. Sign a PDF, a Word file or a photo of a document, without printing it.',
  async run(h, page) {
    await h.step('Choose the document you need to sign.', () => h.upload('#doc', 'rental-agreement.pdf'));
    await h.step('Create your signature: draw it, type it, or upload a photo of it. Here we type it.', async () => { await h.click('button:has-text("Type")'); await h.type('#typed', 'Amina Otieno'); });
    await h.step('Press Use this signature, then add it to the page with Signature. You can also add the date.', async () => { await h.click('#useSig'); await h.click('#addSig'); await h.click('#addDate'); });
    await h.step('Drag each item into place, then download the signed document.', () => h.point('#download'));
    await h.sampleDownload('#download', 'Signed document from this video');
  }
});

S('ocr-forge.html', {
  title: 'OCR Forge', subtitle: 'Turn a photo of text into editable text',
  intro: 'Welcome to OCR Forge. It reads the text in a photo or scan, privately on your device.',
  async run(h, page) {
    await h.step('Choose a clear image. Here is a photo of a bakery receipt.', () => h.upload('#image', 'scan.png'));
    await h.step('Select the document language and press Extract text.', async () => { await h.select('#language', 'eng'); await h.click('#extract'); });
    await h.skip('Skipping ahead while the text is read', () => page.waitForFunction(() => document.querySelector('#output').value.trim().length > 40, null, { timeout: 240000 }));
    await h.step('Check names and numbers, then copy the text or download it.', () => h.point('#output'));
    await h.sampleDownload('#save', 'Extracted text from this video');
  }
});

// ---------------------------------------------------------------- video & audio
S('media-convert.html', {
  title: 'Media Convert', subtitle: 'Video to GIF, audio extraction and transcripts',
  intro: 'Welcome to Media Convert. Turn video into a GIF, pull out the audio, or transcribe speech.',
  async run(h, page) {
    await h.step('Choose a video. Pick where the GIF should start and how long it is.', async () => { await h.upload('#gifFile', 'clip.webm'); await h.fill('#gifLength', '4'); });
    await h.step('Choose the size and smoothness, then press Create and download GIF.', async () => { await h.select('#gifWidth', '540'); await h.point('#makeGif'); });
    await h.sampleDownload('#makeGif', 'GIF made in this video');
    await h.step('The other tabs extract the sound as audio, or write down speech as text.', () => h.point('button:has-text("Extract audio")'));
  }
});

S('media-convert-forge.html', {
  title: 'Media Convert Forge', subtitle: 'Video to GIF, MP3 and smaller MP4',
  intro: 'Welcome to Media Convert Forge. Convert video to a GIF, an MP3 or a smaller MP4.',
  async run(h, page) {
    await h.step('Choose a video or audio file.', () => h.upload('#file', 'clip.webm'));
    await h.step('Pick the output. Here we pull out the sound as an MP3.', () => h.select('#mode', 'mp3'));
    await h.step('Press Convert and download.', () => h.point('#convert'));
    await h.skip('Skipping ahead while the file converts', async () => { await h.sampleDownload('#convert', 'Audio made in this video'); });
  }
});

S('clip-forge.html', {
  title: 'Clip Forge', subtitle: 'Edit with layers and colour, auto-edit, and talk to yourself',
  intro: 'Welcome to Clip Forge. Edit one video with layers, keyframes and a colour grade, let Auto Edit cut several clips into one, and even talk to yourself.',
  async run(h, page) {
    const top = () => page.locator('section.panel').evaluate(el => el.scrollTo(0, 0));
    await h.step('Upload a video. It plays right here in your browser.', () => h.upload('#videoInput', 'clip.webm'));
    await h.step('Trim it, pick a shape, and add text and music.', async () => { await h.fill('#trimStartInput', '1'); await h.fill('#trimEndInput', '7'); await h.select('#aspectSelect', '1:1'); });
    // Layers, keyframes and colour grade. showStage scrolls the page so the whole preview and timeline are in view.
    const showStage = () => page.evaluate(() => window.scrollTo({ top: document.querySelector('section.table').getBoundingClientRect().top + window.scrollY - 8, behavior: 'smooth' })).then(() => h.wait(500));
    await h.step('Add a caption and pick its style: a dark box, a bold outline, or big words with the key word in yellow.', async () => {
      await h.type('#captionTextInput', 'Watch this amazing trick');
      await h.select('#captionPositionInput', 'top');
      await h.select('#captionStyleInput', 'highlight');
      await h.click('#addCaptionBtn');
      await h.click('#tlShowEdit');
      await showStage();
    });
    await h.step('Stack more on top, each on its own track: video, pictures and text. Add a picture.', async () => {
      await h.upload('#lyImageInput', 'drawing-rocket.png');
      await h.fill('#lyEditor input[data-p="x"]', '27'); await h.fill('#lyEditor input[data-p="y"]', '72');
      await showStage();
    });
    await h.step('Add a text layer and type your words.', async () => { await h.click('#lyTextBtn'); await h.fill('#lyEditor textarea[data-f="text"]', 'To the moon!'); await showStage(); });
    await h.step('Animate it with keyframes. Add one near the start.', async () => {
      await h.fill('#tlScrub', '120');
      await h.fill('#lyEditor input[data-p="x"]', '35'); await h.fill('#lyEditor input[data-p="y"]', '30');
      await h.click('#lyEditor [data-act="addkf"]');
      await showStage();
    });
    await h.step('Move the playhead, drag the sliders, and it glides between the keyframes.', async () => {
      await h.fill('#tlScrub', '750');
      await h.fill('#lyEditor input[data-p="x"]', '68');
      await h.fill('#lyEditor input[data-p="rotation"]', '-12');
      await h.fill('#lyEditor input[data-p="scale"]', '45');
      await showStage();
    });
    await h.step('Every track sits on the timeline under the preview. Drag a bar to move it, or drag its ends to trim it.', async () => { await showStage(); await h.point('#tlTracks'); });
    await h.step('Give it a colour grade. Start from a look, then fine-tune, reorder or switch off each adjustment.', async () => { await h.select('#grPreset', 'vintage'); await h.point('#grList'); await showStage(); });
    await h.step('Press play to watch the edit, then press Render video.', async () => { await h.fill('#tlScrub', '0'); await showStage(); await h.click('#tlPlay'); await h.wait(5000); await h.point('#renderBtn'); });
    // Talk to yourself
    await h.step('Now the fun part: talk to yourself. Open Talk to yourself.', async () => { await top(); await h.click('#cloneBox summary'); });
    await h.step('Film yourself on one side of the sofa asking something, with the camera standing still. Add it as take 1.', () => h.upload('#cloneInputA', 'sofa-take-1.webm'));
    await h.step('Then sit on the other side and answer. Add that as take 2.', () => h.upload('#cloneInputB', 'sofa-take-2.webm'));
    await h.skip('Skipping ahead while it listens to both takes', () => page.waitForSelector('#cloneOptions', { state: 'visible', timeout: 60000 }));
    await h.step('Clip Forge listens to both takes and times them, so you take turns instead of talking over each other.', () => h.point('#cloneStatus'));
    await h.step('Press Preview. Move the join into the empty space between you, and soften its edge.', async () => { await h.click('#clonePreviewBtn'); await h.wait(5800); });
    await h.step('Press Make the video.', () => h.click('#cloneRenderBtn'));
    await h.skip('Skipping ahead while the video renders', () => page.waitForSelector('#cloneToAeBtn:visible', { timeout: 120000 }));
    await h.step('There are two of you. Download it, or add it to Auto Edit for text, effects and music.', () => h.click('#cloneToAeBtn'));
    // Auto Edit
    await h.step('Auto Edit turns several clips into one video. Add more clips. It watches each for movement, light, focus and sound.', () => h.upload('#aeClipsInput', ['jam-drums.webm', 'jam-guitar.webm']));
    await h.skip('Skipping ahead while it measures the clips', () => page.waitForFunction(() => /3 clips measured/.test(document.querySelector('#aeStatus').textContent), null, { timeout: 120000 }));
    await h.step('Choose what it is for, what it is about, and how it should end.', async () => { await h.select('#aeGoal', 'ad'); await h.type('#aeAbout', 'Cookie thief caught on camera'); await h.type('#aeCta', 'Follow for part two'); });
    await h.step('Add music and every cut lands on its beat. Add a video you like, and Auto Edit copies its rhythm.', () => h.point('label[for="aeRefInput"]'));
    await h.step('Press Plan the edit. The AI picks the best moments, opens on a hook, and keeps the shots short.', () => h.click('#aePlanBtn'));
    await h.skip('Skipping ahead while it plans', () => page.waitForSelector('#aeShotList .ae-item', { timeout: 120000 }));
    await h.step('Every cut is listed. Watch, move or remove any of them.', () => h.point('#aeShotList'));
    await h.step('Let the AI pick text, effects and sounds that fit.', () => h.click('#aeFxAiBtn'));
    await h.skip('Skipping ahead while the AI picks', () => page.waitForFunction(() => /picked|random/.test(document.querySelector('#aeFxStatus').textContent), null, { timeout: 120000 }));
    await h.step('Or press Surprise me for a fresh mix.', async () => { await page.evaluate(() => { document.querySelector('#aeFxStatus').textContent = ''; }); await h.click('#aeFxRandomBtn'); });
    await h.skip('Skipping ahead while it picks again', () => page.waitForFunction(() => /picked|random|Rolled/.test(document.querySelector('#aeFxStatus').textContent), null, { timeout: 120000 }));
    await h.step('Change anything yourself: an effect, a sound, or your own text on any shot.', async () => {
      const shot = page.locator('#aeShotList .ae-item').nth(1);
      await shot.locator('select[data-f="fx"]').selectOption('punch');
      await shot.locator('select[data-f="sfx"]').selectOption('whoosh');
      await shot.locator('input[data-f="text"]').fill('Caught!');
      await h.point('#aeShotList .ae-item:nth-child(2)');
    });
    await h.step('Press Render the edit.', () => h.click('#aeRenderBtn'));
    await h.skip('Skipping ahead while the video renders', () => page.waitForSelector('#downloadVideoBtn:not([disabled]):visible', { timeout: 180000 }));
    await h.step('Preview the result, then download it.', () => h.point('#downloadVideoBtn'));
    await h.sampleDownload('#downloadVideoBtn', 'Video made in this video');
  }
});

S('merge-forge.html', {
  title: 'Merge Forge', subtitle: 'Combine clips, images, text and music',
  intro: 'Welcome to Merge Forge. Combine pictures and clips with text and music into one video.',
  async run(h, page) {
    await h.step('Add your images and clips in order.', () => h.upload('#mediaInput', ['drawing-house.png', 'drawing-rocket.png', 'drawing-cat.png']));
    await h.step('Choose a transition, the shape, and add a caption.', async () => { await h.select('#transitionSelect', 'fade'); await h.type('#captionTextInput', 'Our drawings'); await h.click('#addCaptionBtn'); });
    await h.step('Pick background music, or record your own voice.', () => h.click('button:has-text("Cheerful")'));
    await h.step('Press Merge and render video.', () => h.click('#renderBtn'));
    await h.skip('Skipping ahead while the video renders', () => page.waitForSelector('#downloadVideoBtn:not([disabled]):visible', { timeout: 240000 }));
    await h.step('Play the preview, then download the finished video.', () => h.point('#downloadVideoBtn'));
    await h.sampleDownload('#downloadVideoBtn', 'Video made in this video');
  }
});

S('video-forge.html', {
  title: 'Video Forge', subtitle: 'Bring drawings to life',
  intro: 'Welcome to Video Forge. Turn drawings and pictures into a moving video.',
  async run(h, page) {
    await h.step('Add drawings, photos or scans, in the order they should appear.', () => h.upload('#drawingInput', ['drawing-house.png', 'drawing-rocket.png', 'drawing-cat.png']));
    await h.step('Choose how they move: a slow zoom, quick cuts, or a flipbook. Then choose a transition.', async () => { await h.select('#modeSelect', 'kenburns'); await h.select('#transitionSelect', 'fade'); });
    await h.step('Add a title, captions and music if you like, then press Render video.', async () => { await h.click('button:has-text("Playful")'); await h.click('#renderBtn'); });
    await h.skip('Skipping ahead while the video renders', () => page.waitForSelector('#downloadVideoBtn:not([disabled]):visible', { timeout: 240000 }));
    await h.step('Preview it, and download the video.', () => h.point('#downloadVideoBtn'));
    await h.sampleDownload('#downloadVideoBtn', 'Video made in this video');
  }
});

S('music-forge.html', {
  title: 'Music Forge', subtitle: 'Describe music, get a track, use it anywhere',
  intro: 'Welcome to Music Forge. Describe the music you want, and it is composed in seconds, free, right in your browser. Every track is yours to use anywhere.',
  async run(h, page) {
    await h.step('Describe the music in your own words: the style, the mood, how fast and how long. It shows what it understood.', async () => { await h.type('#mfPrompt', 'Upbeat pop for my travel vlog, 30 seconds, with piano', { visible: 60 }); await h.point('#mfUnderstood'); });
    await h.step('No idea yet? Tap a quick idea. Style, mood and length are optional, and Match my video makes the music exactly as long as your video.', async () => { await h.point('#mfIdeas'); await h.point('#mfLenVideo + span'); });
    await h.step('Press Make my music. It takes a few seconds.', async () => { await h.click('#mfMake'); await page.waitForSelector('#finisherWrap:not([hidden])', { timeout: 60000 }); });
    await h.wait(600);
    await h.step('Not quite right? One tap changes it: faster, slower, happier, darker, calmer, more energy, drums on or off, shorter or longer.', async () => { await h.click('[data-change="faster"]'); await page.waitForFunction(() => !document.getElementById('mfMake').disabled, null, { timeout: 60000 }); });
    await h.step('Now finish it. Play, pause, restart or loop it, and drag the sliders to trim the start and end, add fades, or change the volume.', async () => { await h.point('#fnWave'); await h.point('#fnFadeOut'); await page.$eval('#fnFadeOut', el => { el.value = 3; el.dispatchEvent(new Event('input')); }); });
    await h.step('Download it as MP3 for phones and videos, or WAV for editing. Stems give you the drums, bass, chords and melody as separate files.', () => h.point('#fnMp3'));
    await h.sampleDownload('#fnWav', 'Music made in this video');
    await h.step('Or send it straight into another MigaBuilder tool, like Clip Forge for the background music of a video, or Game Forge for a game.', () => h.point('.fn-use-grid'));
    await h.step('There are free sound effects too: a whoosh, a riser, an impact, a coin and more.', () => h.click('[data-sfx="coin"]'));
    await h.step('Want a real song with singing and lyrics? The AI song tab uses Google’s music AI with your own Gemini key, about four to eight cents a song, with a daily safety limit.', async () => { await h.click('#aiModeBtn'); await h.point('.ai-keybox'); });
    await h.step('And the Beat maker lets you build your own beat step by step. Load the example to start.', async () => { await h.click('#trackerModeBtn'); await h.click('#exampleBeatBtn'); await page.waitForFunction(() => document.querySelectorAll('.step-cell.active').length > 10); await h.point('#stepGrid'); });
    await h.step('Finally, Can I use this music explains exactly what you may do with each kind of track.', () => h.point('#mfRights'));
  }
});

S('talk-forge.html', {
  title: 'Talk Forge', subtitle: 'Make a photo talk',
  intro: 'Welcome to Talk Forge. Make a photo speak, with moving lips.',
  async run(h, page) {
    await h.step('Add a photo. Faces are found automatically, or you can place a face yourself.', () => h.upload('#photoInput', 'portrait.png'));
    await h.step('Here we place it by hand: press Place manually, then click the left eye, the right eye and the mouth.', async () => {
      await h.click('#manualAddBtn');
      // portrait.png is 800×800: eyes at (338, 370) and (465, 370), mouth at (400, 498).
      await page.locator('#stageCanvas').scrollIntoViewIfNeeded();
      const box = await page.locator('#stageCanvas').boundingBox();
      for (const [ix, iy] of [[338, 370], [465, 370], [400, 498]]) {
        const x = box.x + ix * box.width / 800, y = box.y + iy * box.height / 800;
        await page.evaluate(([x, y]) => { window.__tv.cursor(x, y); window.__tv.click(x, y); }, [x, y]);
        await page.mouse.click(x, y); await h.wait(700);
      }
    });
    await h.step('Choose who says the line, then type what they say, or record your own voice.', async () => {
      await h.select('.line-face-select', { index: 0 });
      await h.type('textarea:visible', 'Hello! Welcome to Sunrise Bakery. We bake fresh bread, warm rolls and sweet cakes every single morning. Come and say hello!');
    });
    await h.step('Pick a voice, and press Preview to watch the lips move.', async () => {
      await h.select('#voiceSelect', '1');
      await h.click('#previewBtn', { timeout: 8000 }).catch(() => h.point('#previewBtn'));
      // Bring the photo back into view so the moving lips are visible.
      await h.scroll('#stageCanvas', 'center');
    });
    await h.wait(1500);
    await h.sampleShot('#previewBtn >> xpath=ancestor::*[self::section or self::main or self::div][3]', 'Talking photo set up in this video').catch(() => h.sampleShot('body', 'Talking photo set up in this video'));
    await h.step('When you are happy, record it and download the video.', () => h.point('#recordBtn'));
  }
});

S('record-forge.html', {
  title: 'Record Forge', subtitle: 'Record your screen with narration',
  intro: 'Welcome to Record Forge. Record your screen with your voice, to show someone how something works.',
  async run(h) {
    await h.step('Choose what to include: your microphone, the computer sound, and your webcam in a corner.', async () => { await h.check('#micCheckbox'); await h.point('#facecamCheckbox'); });
    await h.step('Press Start recording, and choose the screen, window or browser tab to record.', () => h.point('#startBtn'));
    await h.step('Show the task and explain as you go. When you stop, trim the start and end and download the recording.', () => h.point('#startBtn'));
    await h.sampleShot('main', 'Recording settings from this video');
  }
});

// ---------------------------------------------------------------- meetings, sharing, other
S('meet-forge.html', {
  title: 'Meet Forge', subtitle: 'Group video meetings and topic groups',
  intro: 'Welcome to Meet Forge. Host a free video meeting, or an always open group for your team.',
  async run(h) {
    await h.step('Enter your name and a meeting name.', async () => { await h.type('#displayName', 'Amina'); await h.type('#meetingTitle', 'Bakery team check-in'); });
    await h.step('Press Create new meeting, then share the link with the people you want to invite.', () => h.point('#newMeeting'));
    await h.step('To join someone else’s meeting, paste their link or code here.', () => h.point('#joinCode'));
    await h.step('Or create an always open group with separate topics, like a small community.', () => h.point('#createCommunity'));
    await h.sampleShot('main', 'Meeting setup from this video');
  }
});

S('screen-forge.html', {
  title: 'Screen Share Forge', subtitle: 'Live remote help, without installing anything',
  intro: 'Welcome to Screen Share Forge. Help someone by seeing their screen live, without installing anything.',
  async run(h) {
    await h.step('If you are the helper, press I want to help someone. You get a short code and a link to send.', () => h.point('#startHelperBtn'));
    await h.step('The person who needs help opens the link, or presses the second button and types your code. Then they choose what to share: a window, a tab or the whole screen.', () => h.point('#startClientBtn'));
    await h.step('You see their screen live and can point at things. The video goes directly between the two browsers, and nothing is recorded unless you choose to.', () => h.point('#startHelperBtn'));
    await h.sampleShot('body', 'Screen Share Forge start screen');
  }
});

S('post-forge.html', {
  title: 'Post Forge', subtitle: 'Post to Discord, Bluesky and Mastodon at once',
  intro: 'Welcome to Post Forge. Write one announcement and post it to several networks at once.',
  async run(h) {
    await h.step('Connect your accounts once. The keys are saved only in this browser.', () => h.point('#discordWebhook'));
    await h.step('Write your announcement, add a link and an image.', async () => { await h.type('#postText', 'Fresh sourdough is back tomorrow from 7 am! Come early, it sells out fast. 🍞'); await h.type('#postLink', 'https://migabuilder.com'); });
    await h.step('Tick where it should go, and press Post now.', () => h.point('#postBtn'));
    await h.sampleShot('main', 'Post written in this video');
  }
});

S('project-hub.html', {
  title: 'Project Hub', subtitle: 'Your projects, stored on this device',
  intro: 'Welcome to Project Hub. It shows the projects and settings MigaBuilder saved in this browser.',
  async run(h) {
    await h.step('Every tool that remembers your work lists it here, so you can open it again.', () => h.point('main'));
    await h.step('Export a backup to move your work to another device, and restore it there.', () => h.point('#exportBtn'));
    await h.sampleDownload('#exportBtn', 'Backup file from this video');
    await h.step('You can also remove data you no longer need. Nothing is stored on a server.', () => h.point('#refreshBtn'));
  }
});

S('sim-forge.html', {
  title: 'Vehicle Simulator', subtitle: 'Learn to drive, ride, steer and fly',
  intro: 'Welcome to the Vehicle Simulator. Learn how cars, boats, planes and helicopters work, then practise.',
  async run(h, page) {
    await h.step('Choose a vehicle. Let us start with the car.', () => h.click('button:has-text("Car")'));
    await h.step('First read how it works: the pedals, the gears and the mirrors.', () => h.click('button:has-text("How it works")'));
    await h.step('Then learn the controls and what each warning light means.', () => h.click('button:has-text("Controls")'));
    await h.step('Now open the simulator. Use the on-screen pedals, or the arrow keys, to drive through each mission.', async () => {
      await h.click('button:has-text("Simulator")');
      await h.click(page.getByRole('button', { name: 'D', exact: true })).catch(() => {});
      const gas = page.locator('button:has-text("Gas")').first(); await h.point(gas);
      const b = await gas.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await h.wait(2200); await page.mouse.up();
      for (const k of ['ArrowUp', 'ArrowRight', 'ArrowUp']) { await page.keyboard.down(k); await h.wait(700); await page.keyboard.up(k); }
    });
    await h.sampleShot('body', 'Simulator from this video');
    await h.step('At the end, take the knowledge check and print your report card.', () => h.click('button:has-text("Knowledge check")'));
  }
});

S('3d-cartoon.html', {
  title: '3D Cartoon', subtitle: 'Your story as a cel-shaded 3D cartoon',
  intro: 'Welcome to 3D Cartoon. Describe a story, and watch it play as a 3D cartoon with talking characters, right in your browser.',
  async run(h, page) {
    await h.step('Write your story idea here. Say who is in it and what happens.', () => h.type('#story', 'A shy robot and a grumpy alien get lost in the forest, and a furry little forest creature helps them find the way home.'));
    await h.step('Pick how long it should be and the tone. The free Gemini AI needs no key.', () => h.select('#tone', 'funny'));
    await h.step('Press Make my 3D cartoon. The AI writes the script and picks the characters and places.', () => h.click('#makeBtn'));
    await h.skip('Writing the script', () => page.waitForFunction(() => /ready/i.test(document.getElementById('status').textContent) || /Could not/.test(document.getElementById('status').textContent), null, { timeout: 120000 }));
    await h.step('Here is the cast and the script. There are eleven kinds of characters, from robots and aliens to dragons, ghosts and a big eared gremlin imp.', () => h.point('#cast'));
    await h.step('Press play to watch it.', async () => { await h.scroll('.stage-wrap', 'center'); await h.click('#startBtn'); });
    await h.step('Every character moves, talks and reacts, and the camera follows whoever is speaking.', () => h.wait(9000));
    await h.sampleShot('#stage', 'Scene from this video');
    await h.step('Tick Voices to hear the characters speak, or press Download video to save the whole cartoon as a video file.', () => h.point('#recBtn'));
  }
});

S('templates.html', {
  title: 'Template Gallery', subtitle: 'Ready-made starting points',
  intro: 'Welcome to the Template Gallery: ready made starting points for websites, games, cartoons and documents.',
  async run(h) {
    await h.step('Browse the templates and pick the result you want to create.', () => h.point('main'));
    await h.step('Open a template, and it loads in the right tool, ready for you to change the words, pictures and colours.', () => h.point('main a >> nth=0'));
    await h.sampleShot('main', 'Template gallery');
  }
});

// The home page tour (shown in the "Tour MigaBuilder" section of index.html).
S('index.html', {
  title: 'MigaBuilder', subtitle: 'Find the right free tool in one minute',
  outroSay: 'Now it is your turn. Pick a tool and try it yourself. It is free, and there is nothing to sign up for.',
  intro: 'Welcome to MigaBuilder: sixty six free tools that work right in your browser, with no signup and no watermark. Here is how to find the one you need.',
  async run(h, page) {
    await h.step('Start with the search box. Type what you want to make, like invoice, and the best match lights up. Press Enter to open it.', () => h.type('#toolSearch', 'invoice'));
    await h.step('Small typos are fine, and everyday words work too, such as resume for the CV maker.', async () => { await page.fill('#toolSearch', ''); await h.type('#toolSearch', 'resume'); });
    await h.step('Or browse by category. The row of tiles under the search box groups every tool: create, video and audio, business, documents, learning and design.', async () => { await page.fill('#toolSearch', ''); await page.dispatchEvent('#toolSearch', 'input'); await h.point('.tool-group-toggle >> nth=0'); });
    await h.step('Not sure where to start? Pick who you are, such as Developers or Students and teachers, to see the tools made for you.', async () => { await h.click('[data-role=student]'); await h.wait(600); await h.click('[data-role=all]'); });
    await h.step('Pick a tile, and its tools open right underneath, each with a one line description.', () => h.click('.tool-group[data-category=business] .tool-group-toggle'));
    await h.step('Tap the star on any tool to keep it in your favourites. Favourites and recently used tools are saved only in this browser.', async () => { await h.click('.tool-group[data-category=business] .fav-toggle >> nth=0'); await h.unring(); });
    await h.step('Want to see everything at once? Open all categories with one click.', () => h.click('#toggleAll'));
    await h.step('The whole page speaks your language. Choose Spanish, Arabic, Chinese or Swahili here.', async () => { await h.click('#toggleAll'); await h.select('#i18nLangSelect', 'es'); });
    await h.step('Switch back at any time. Your choice is remembered on every page.', () => h.select('#i18nLangSelect', 'en'));
    await h.step('Below the categories you will find the popular tools, and the newest ones.', async () => { await h.unring(); await h.scroll('#popularTools', 'center'); });
    await h.step('Ready to start? Press Build a website, or pick any tool. Every tool has its own narrated video like this one.', async () => { await h.scroll('header', 'start'); await h.point('.cta-build'); });
    await page.evaluate(() => { try { localStorage.removeItem('migabuilder-tool-favourites'); localStorage.removeItem('migabuilderLang'); } catch (e) {} });
  }
});

const { parseEbookToText } = require('./src/lib/parser');
const EPub = require('epub2');
console.log("EPub class", typeof EPub);
async function test() {
  try {
    const text = await parseEbookToText('test.epub', 'epub');
    console.log("Parsed length:", text.length);
    console.log(text.substring(0, 200));
  } catch(e) {
    console.error(e);
  }
}
test();

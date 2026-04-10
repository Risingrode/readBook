const EPub = require('epub2');
async function test() {
  try {
    const epub = await EPub.createAsync('./test.epub');
    console.log("Success", epub.metadata.title);
  } catch(e) {
    console.log("Failed", e);
  }
}
test();

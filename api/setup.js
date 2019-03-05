const uuidv4 = require('uuid/v4')
const fs = require('fs')
const {join} = require('path')
const {TSParser} = require('tsparser')
const db = require('./database-connection')

const folder = process.argv[2]
const datasetName = process.argv[3] || folder

if (!folder) {
  console.log('No folder of docs specified. Example: node setup.js docs1 <optional dataset name>')
  process.exit()
}


async function sleep(ms) {
  await new Promise(resolve => { setTimeout(resolve, ms)});
};

async function runQuery() {
  try { await db.query.apply(this,arguments) }
  catch(err) { console.error(err.toString()) }
};

async function runFromFile(fn) {
  const SQL = fs.readFileSync(`${__dirname}/${fn}`, "utf8");
  const statements = TSParser.parse(SQL, 'pg', ';');
  await db.tx(async function(){
    for (var statement of statements) {
      await runQuery(statement);
    }
  });
};

const insertImageStack = `INSERT INTO image_stack
                    (image_id, stack_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING`

const insertStack = `INSERT INTO stack
                    (stack_id, stack_type)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING`

const insertImage = `INSERT INTO image
                    (image_id, doc_id, page_no, file_path)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING`

const checkImage = `SELECT image_id FROM image
                    WHERE doc_id=$1 AND page_no=$2
                    `

async function setup() {
  // Entire setup script using helpers above
  let connected = false
  while (!connected) {
    try {
      await db.connect();
      connected = true
    } catch(err) {
      console.error("Can't connect to database yet");
      await sleep(1000);
    }
  }

  await runFromFile("schema.sql");
  await runFromFile("tag-data.sql");

  await db.query(insertStack, [
    datasetName,
    "annotation"
  ]);
  for (var entry of fs.readdirSync(join(folder))) {

    let stats = fs.statSync(join(folder, entry))
    // For each entry check if it is a directory
    if (!stats.isDirectory()){
        // It's a file!
                let parts = entry.split('_')
                if (!parts.length) continue
                let doc_id = parts[0]
                let page_no = parts[2]
                let file_path = join(folder, entry);
                let row = await db.oneOrNone("SELECT image_id FROM image WHERE doc_id=$1 AND page_no=$2", [doc_id, page_no]);
                let image_id = null
                    if (row == null) {
                        image_id = uuidv4();
                    } else {
                        image_id = row.image_id;
                    }

                // add image -- does nothing if docid, pageno exit
                await db.query(insertImage, [
                        image_id,
                        doc_id,
                        page_no,
                        file_path
                        ]);

                // associate image_id to stack
                await db.query(insertImageStack, [
                        image_id,
                        datasetName
                        ]);
    } else {
    // Now we know this is a document
    let doc_id = entry
    // Get all the pages for this document and insert them into the database
    for (var page of fs.readdirSync(join(folder, doc_id, 'png'))) {
      let parts = page.split('_')
      if (!parts.length) continue
      let page_no = parts[1]
      let file_path = join(doc_id, 'png', page);
      let row = await db.oneOrNone("SELECT image_id FROM image WHERE doc_id=$1 AND page_no=$2", [doc_id, page_no]);
      let image_id = null
      if (row == null) {
        image_id = uuidv4();
      } else {
        image_id = row.image_id;
      }

      // add image -- does nothing if docid, pageno exit
      await db.query(insertImage, [
        image_id,
        doc_id,
        page_no,
        file_path
      ]);

      // associate image_id to stack
      await db.query(insertImageStack, [
        image_id,
        datasetName
      ]);
    }
    }
  }
}

(async function(){
  try {
    await setup()
    process.exit(0)
  }
  catch (err) { console.error(err.toString()) }
})();

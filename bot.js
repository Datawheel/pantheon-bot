const twit = require("twit");
const config = require("./config.js");
const fetch = require("fetch-base64");
const puppeteer = require("puppeteer-core");

// initialize twit helper lib
const Twitter = new twit(config);

// consts
const PROFILE = "person/jonathan_richman";
const STATUS = "The biography of Jonathan Richman is available in 15 different languages on Wikipedia making him the 1031st most popular Singer and the 6044th most popular biography from United States. View more at https://pantheon.world/profile/person/jonathan_richman";
const WAIT_FOR_PAGE = 10000;

(async() => {
  // const browser = await puppeteer.launch();
  console.log("Opening browser...");
  const browser = await puppeteer.launch({executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const page = await browser.newPage();
  const urlToTrigger = `https://pantheon.world/profile/${PROFILE}/`;
  console.log(`Navigating to ${urlToTrigger}...`);
  await page.goto(urlToTrigger, {waitUntil: "networkidle2"});
  const html = await page.content();

  // find the link to the page og:image meta tag url:
  // <meta data-react-helmet="true" property="og:image" content="**FETCH THIS**">
  // in plain english this regex looks for all instances of the above meta tag ^
  // captures everything after the literal: content=" and stops when it sees another
  // quote (") meaning the tag is closed.
  const ogImgUrlMatches = (/meta data-react-helmet=\"true\" property\=\"og\:image\" content\=\"([^"]*)\"/).exec(html);
  if (ogImgUrlMatches) {
    const ogImgUrl = ogImgUrlMatches[1].replace("http://", "https://");
    console.log(`ogImgUrl: ${ogImgUrl}`);
    console.log(`${WAIT_FOR_PAGE} milisecond second delay while image renders server-side...:`);
    setTimeout(() => {

      fetch.remote(ogImgUrl).then(data => {
        // data[1] contains base64-encoded jpg with MimeType, data[0] is without MimeType
        // twitter doesn't want the mime-type to be included
        const b64content = data[0];

        console.log("Uploading an image...");
        Twitter.post("media/upload", {media_data: b64content}, (err, data, response) => {
          if (err) {
            console.log("ERROR:");
            console.log(err);
          }
          else {
            console.log("Image uploaded!");
            console.log("Now tweeting it...");

            Twitter.post("statuses/update", {
              media_ids: new Array(data.media_id_string),
              status: STATUS
            },
            (err, data, response) => {
              if (err) {
                console.log("ERROR:");
                console.log(err);
              }
              else {
                console.log("Posted an image!");
              }
            }
            );
          }
        });

      }).catch(reason => {});
    
    }, WAIT_FOR_PAGE); // Wait for the image to hopefully be rendered on the server 
  }
  else {
    console.log("ERROR:");
    console.log("Unable to match meta tag.");
  }

  await browser.close();
})();

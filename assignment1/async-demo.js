const fs = require('fs');
const path = require('path');


// Write a sample file for demonstration
const filePath = path.join(__dirname, 'sample-files', 'sample.txt');
fs.writeFileSync(filePath, 'Hello, async world!');

// 1. Callback style
fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
        console.error(error);
        return;
    }

    console.log('Callback:', data);
});


  // Callback hell example (test and leave it in comments):
  // Callback hell is when multiple callbacks are nested inside each other,
  // which can make the code harder to read and maintain.
  //
  // fs.readFile(filePath, 'utf8', (error, data) => {
  //     fs.readFile(filePath, 'utf8', (error, data) => {
  //         fs.readFile(filePath, 'utf8', (error, data) => {
  //             console.log(data);
  //         });
  //     });
  // });
    
  
  


  // 2. Promise style
  const readFilePromise = (file) => {
      return new Promise((resolve, reject) => {
          fs.readFile(file, 'utf8', (error, data) => {
              if (error) {
                  reject(error);
                  return;
              }

              resolve(data);
          });
      });
  };

  readFilePromise(filePath)
      .then((data) => {
          console.log('Promise:', data);
      })
      .catch((error) => {
          console.error(error);
      });


      // 3. Async/Await style
      async function readFileAsync() {
          try {
              const data = await readFilePromise(filePath);
              console.log('Async/Await:', data);
          } catch (error) {
              console.error(error);
          }
      }

      readFileAsync();

class Runner {
    static async run() {
        chrome.runtime.sendMessage({message: "getAccessToken"}, (response) => {
            console.log("got response: " + JSON.stringify(response) + " " + Date.now());
            if (response.message === 'success') {
                const accessToken = response.payload;
                console.log("loaded site!2 " + accessToken);
                const documentClone = document.cloneNode(true);
                const article = new Readability(documentClone).parse();
                console.log(article.textContent.substring(0, 10000));
                console.log("finished foreground.js");

                // TODO: find max length we can send ChatGPT + check if it is possible to send it in chunks if it's bigger
                chrome.runtime.sendMessage({message: "queryChatGPT", data: article.textContent.substring(0, 10000)}); 
                // TODO: now we need to be able to keep on talking to ChatGPT in the same discussion
                // We also need to open a discussion per website we visit
            }
        });
    }
};

Runner.run();

// TODO: add a linter
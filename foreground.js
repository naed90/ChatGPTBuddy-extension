class UI {
    constructor() {
        this.widget = this.createWidget();
        this.currentElement = undefined;
    }

    // Helper function
    static applyCSS(element, style) {
        for (const property in style) {
            element.style[property] = style[property];
        }
    }

    createWidget() {
        if (this.widget) {
            return;
        }

        const widget = document.createElement('div');
        UI.applyCSS(widget, UI.widgetStyle);
        document.body.appendChild(widget);
        return widget;
    }

    clearWidget() {
        this.widget.replaceChildren(); // clears all existing children
        const emptyDiv = document.createElement('div'); // empty element, representing the top
        this.currentElement = emptyDiv;
        this.widget.appendChild(emptyDiv);
    }

    appendToWidget(elem) {
        this.currentElement.insertAdjacentElement('afterend', elem);
        this.currentElement = elem;
    }

    setMessages(messages) {
        this.clearWidget();

        for (const index in messages) {
            const message = messages[index];
            const elem = document.createElement('div');
            UI.applyCSS(elem, UI.messageStyle);
            let img = undefined;
            if (message.user) {
                UI.applyCSS(elem, UI.messageRightStyle);
                img = document.createElement("img");
                img.src = chrome.runtime.getURL("images/icon-550x550.png");
                img.alt = "ChatGPT Buddy";
                elem.appendChild(img);
                UI.applyCSS(img, UI.imageStyle);
            }
            
            const p = document.createElement('p');
            UI.applyCSS(p, UI.paragraphStyle);
            p.innerText = message.text;
            if (img) {
                img.insertAdjacentElement('afterend', p);
            } else {
                elem.appendChild(p);
            }
            this.appendToWidget(elem);
        }

        // Scroll to bottom of widget:
        this.widget.scrollTop = this.widget.scrollHeight;
    }

    test() {
        let messages = [];
        const new_this = this; // In the context below, `this` refers to the anonymous function below
        (function addMessage() {
            if(messages.length < 100) {
                messages = messages.concat([{text:("a".repeat(messages.length)), user:(messages.length % 2)}]);
                new_this.setMessages(messages);
                setTimeout(addMessage, 1000);
            }
        })();
    }
};

// CSS:
UI.widgetStyle = {
    border: "2px solid #eeeeee",
    position : "fixed",
    display : "block",
    top : "75%",
    left : "70%",
    right : "2%",
    bottom : "2%",
    backgroundColor : "rgba(0,0,0,0.95)",
    zIndex : "1000",
    cursor : "pointer",
    overflow: "auto"
}
UI.messageStyle = {
    border: "2px solid #dedede",
    backgroundColor: "rgba(37, 37, 37, 0.8)",
    borderRadius: "20px",
    padding: "10px",
    margin: "10px 10px",
    overflowWrap: "break-word"
}
UI.messageRightStyle = {
    borderColor: "#ccc",
    backgroundColor: "rgba(90, 90, 90, 0.8)"
}
UI.imageStyle = {
    float: "right",
    maxWidth: "30px",
    width: "100%",
    marginLeft: "20px",
    marginRight:"0",
    marginTop:"0",
    marginBottom: "0",
    borderRadius: "50%"
}
UI.paragraphStyle = {
    margin: "0"
}

class PageParser {
    constructor () {};

    getTextBeingRead() {
        const documentClone = document.cloneNode(true);
        const article = new Readability(documentClone).parse();
        const text = article.textContent.substring(0, 10000);
        // TODO: find max length we can send ChatGPT + check if it is possible to send it in chunks if it's bigger
        // TODO: focus only on visible text (the above now gets us lots of text which is hidden on the page)
        return text;
    }
}

class Buddy {
    constructor() {
        this.pageParser = new PageParser();
    };

    async run() {
        chrome.runtime.sendMessage({message: "getAccessToken"}, (response) => {
            console.log("got response: " + JSON.stringify(response) + " " + Date.now());
            if (response.message === 'success') {
                const accessToken = response.payload;
                console.log("loaded site!2 " + accessToken);
                const text = this.pageParser.getTextBeingRead();
                chrome.runtime.sendMessage({message: "queryChatGPT", data: text}); 
                // TODO: now we need to be able to keep on talking to ChatGPT in the same discussion
                // We also need to open a discussion per website we visit
            }
        });
    }
}

class Runner {
    static async run() {
        const ui = new UI();
        ui.test();

        const buddy = new Buddy();
        // buddy.run();
    }
};

Runner.run();

// TODO: add a linter
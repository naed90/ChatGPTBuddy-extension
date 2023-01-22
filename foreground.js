class UI {
    constructor() {
        this.widget = this.createWidget();
        this.inputBox = this.createInputBox();
        this.sendButton = this.createSendButton();
        this.form = this.createForm();
        this.currentElement = undefined;

        // Init:
        this.setMessages([]);
    }

    // Helper function
    static applyCSS(element, style) {
        for (const property in style) {
            element.style[property] = style[property];
        }
    }

    static formSubmitted(event) {
        // TODO: disable submitting the form until the ai responded
        const text = event.target.elements[UI.inputBoxName].value;
        event.target.elements[UI.inputBoxName].value = "";
        messageManager.sendMessageToBackend(text); // TODO: terrible design, just for now...
        return false;
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

    createInputBox () {
        if (this.inputBox) {
            return;
        }
        const input = document.createElement("input");
        input.setAttribute("type", "text");
        UI.applyCSS(input, UI.inputStyle);
        input.name = UI.inputBoxName;
        return input;
    }

    createSendButton() {
        if (this.sendButton) {
            return;
        }

        const button = document.createElement("button");
        const imageSrc = chrome.runtime.getURL("images/sendButton.png");
        button.innerHTML = '<img src=' + imageSrc + ' width=100%/>';
        UI.applyCSS(button, UI.buttonStyle);
        return button;
    }

    createForm() {
        if (this.form) {
            return;
        }

        const form = document.createElement("form");
        UI.applyCSS(form, UI.formStyle);
        form.appendChild(this.inputBox);
        form.appendChild(this.sendButton);
        form.onsubmit = UI.formSubmitted;
        return form;
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

        // this.appendToWidget(this.inputBox);
        // this.inputBox.insertAdjacentElement('afterend', this.sendButton);
        this.appendToWidget(this.form);

        // Scroll to bottom of widget:
        this.widget.scrollTop = this.widget.scrollHeight;
    }

    test() {
        let messages = [];
        const new_this = this; // In the context below, `this` refers to the anonymous function below
        (function addMessage() {
            if(messages.length < 5) {
                messages = messages.concat([{text:("a".repeat(messages.length)), user:(messages.length % 2)}]);
                new_this.setMessages(messages);
                setTimeout(addMessage, 100);
            }
        })();
    }
};
UI.inputBoxName = "textbox";

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
    margin: "0",
    color: "rgb(250, 250, 250)"
}
UI.formStyle = {
    display: "flex"
}
UI.inputStyle = {
    border: "2px solid #dedede",
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    borderRadius: "10px",
    overflowWrap: "break-word", 
    color: "rgb(230, 230, 230)",
    flexGrow: "1",
    marginLeft: "10px",
    marginRight: "2px"
}
UI.buttonStyle = {
    maxWidth: "30px",
    backgroundColor: "rgba(0,0,0,0)",
    border: "none"
}


class PageParser {
    constructor () {};

    getTextBeingRead() {
        const documentClone = document.cloneNode(true);
        const article = new Readability(documentClone).parse();
        let text = article.textContent;
        text = text.replace(/\s/g, ' ').replace(/\s{2,}/g, ' ');
        text = text.substring(0, 10000);
        // TODO: find max length we can send ChatGPT + check if it is possible to send it in chunks if it's bigger
        // TODO: focus only on visible text (the above now gets us lots of text which is hidden on the page)
        return text;
    }

    getInitialPrompt () {
        return "Hi, I am reading the following text on " + location.hostname +". Please read it and then start a casual conversation about it with me."
    }

    getInitialText() {
        return this.getInitialPrompt() + ' "' + this.getTextBeingRead() + '"';
    }
}

class MessageManager {
    constructor(ui) {
        this.messages = [];
        this.ui = ui;
        this.conversationID = undefined;
    }

    appendMessage(message) {
        this.messages = this.messages.concat(message);
        this.ui.setMessages(this.messages);
    }

    sendMessageToBackend(text) {
        chrome.runtime.sendMessage({message: "queryChatGPT", data: {queryString: text, conversationID: this.conversationID}}, 
            (response) => {
            if (response.message === 'success') {
                let {data, conversationID} = response.payload;
                this.conversationID = conversationID;
                this.receiveMessageFromBackend(data);
            }
        });
        this.appendMessage({text, user: 0});
    }

    receiveMessageFromBackend(text) {
        this.appendMessage({text, user: 1});
    }
}

class Buddy {
    constructor(messageManager, pageParser) {
        this.messageManager = messageManager;
        this.pageParser = pageParser;
    };

    async run() {
        chrome.runtime.sendMessage({message: "getAccessToken"}, (response) => {
            console.log("got response: " + JSON.stringify(response) + " " + Date.now());
            if (response.message === 'success') {
                const accessToken = response.payload;
                console.log("loaded site!2 " + accessToken);
                const text = this.pageParser.getInitialText();
                this.messageManager.sendMessageToBackend(text);
                // TODO: now we need to be able to keep on talking to ChatGPT in the same discussion
                // We also need to open a discussion per website we visit
            }
        });
    }
}

// class Runner {
//     static async run() {
//         const ui = new UI();
//         const messageManager = new MessageManager(ui);
//         const pageParser = new PageParser();
//         const buddy = new Buddy(messageManager, pageParser);
//         buddy.run();
//     }
// };

// Runner.run();

// TODO: terrible design for now, since a static function in UI needs to call statically defined values here
const ui = new UI();
var messageManager = new MessageManager(ui);
const pageParser = new PageParser();
const buddy = new Buddy(messageManager, pageParser);
buddy.run();

// TODO: add a linter
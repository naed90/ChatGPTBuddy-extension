chrome.runtime.onInstalled.addListener(() => {
    // Do nothing
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Do nothing
});

// TODO: import from some library or move to utils
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * We communicate with openai.com through the background page, since 
 * the content script pages don't have the permissions to.
 */
class ChatGPT_API {
    static async getAccessToken() {
        // TODO: understand how long we can cache -- looks like we get some timeout
        // const cached = await chrome.storage.local.get(["accessToken"]);
        // console.log("Got from cache:");
        // console.log(cached);
        // if (cached.accessToken) {
        //     return cached.accessToken;
        // }
        const response = await fetch('https://chat.openai.com/api/auth/session');
        if (response.status === 403) {
            throw new Error('CLOUDFLARE');
        }
        const data = await response.json().catch(() => ({}));
        if (!data.accessToken) {
            throw new Error('UNAUTHORIZED');
        }
        chrome.storage.local.set({accessToken: data.accessToken});
        return data.accessToken;
    }

    // static onMessageFromOpenAIAPI(message) {
    //     console.debug('sse message', message)
    //     if (message === '[DONE]') {
    //         port.postMessage({ event: 'DONE' })
    //         deleteConversation()
    //         return
    //     }
    //     const data = JSON.parse(message)
    //     const text = data.message?.content?.parts?.[0]
    //     conversationId = data.conversation_id
    //     if (text) {
    //         port.postMessage({
    //         text,
    //         messageId: data.message.id,
    //         conversationId: data.conversation_id,
    //         } as Answer)
    //     }
    // }

    static async sendQueryStringToOpenAIAPI(accessToken, queryString) {
        const response = await fetch('https://chat.openai.com/backend-api/conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              action: 'next',
              messages: [
                {
                  id: uuidv4(),
                  role: 'user',
                  content: {
                    content_type: 'text',
                    parts: [queryString],
                  },
                },
              ],
              model: 'text-davinci-002-render',
              parent_message_id: uuidv4(),
            }),
          });
        console.log("got a resoponse from api")
        console.log(response);
        return response;
    }

    static async queryChatGPT(queryString) {
        const accessToken = await ChatGPT_API.getAccessToken();
        const response = await ChatGPT_API.sendQueryStringToOpenAIAPI(accessToken, queryString);
        console.log("in text: ");
        const data = await response.text();
        console.log(data);

        // Loop over response messages from the OpenAI api:
        // if (!response.ok) {
        //     const error = await response.json().catch(() => ({}))
        //     throw new Error(!isEmpty(error) ? JSON.stringify(error) : `${response.status} ${response.statusText}`)
        //   }
        //   const parser = createParser((event) => {
        //     if (event.type === 'event') {
        //       onMessage(event.data)
        //     }
        //   })
        //   for await (const chunk of streamAsyncIterable(response.body!)) {
        //     const str = new TextDecoder().decode(chunk)
        //     parser.feed(str)
        //   }
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // TODO: validate sender?
    switch(request.message) {
        case "getAccessToken":
            ChatGPT_API.getAccessToken().then(x => {sendResponse({message: 'success', payload: x}); console.log(432432421 + " " + Date.now())});
            break;
        case "queryChatGPT":
            ChatGPT_API.queryChatGPT(request.data);
            break;

        default:
            return;
    }
    return true;
});
# twilio-ivr [![Coverage Status](https://coveralls.io/repos/github/ethanresnick/twilio-ivr/badge.svg?branch=master&t=cLE0la)](https://coveralls.io/github/ethanresnick/twilio-ivr?branch=master)

This library makes it easy to build a phone tree/[IVR](https://en.wikipedia.org/wiki/Interactive_voice_response) system using twilio.

Note: although this library has good test coverage and I've had no problems using it in production, it's still pre-1.0 and the API may change as call session functionality is added.

# Usage

The library exports one primary function, which takes all the [states](#states) in your call system and returns an express [app](http://expressjs.com/en/4x/api.html#app) that can handle all the HTTP requests needed to interact with twilio to make your call system work.

```js
const twilioIvr = require("twilio-ivr").default;

// Define an array of your states. See below for how states work.
const states = [];

const config = {
  twilio: { authToken: "...." }
  // ...
};

const app = twilioIvr(states, config);

// Start up your server to take requests from twilio.
app.listen(3000);
```

## Config Options

The config object allows the following keys:

* `twilio` (**required**): an object containing twilio settings.
  * `authToken` (**required**): your twilio auth token.
  * `validate` (optional, default: `true`): a boolean indicating whether the express app should reject incoming requests that aren't coming from twilio. For security, it's a good idea to set this to true in production. However, when making requests to your own app during development or testing, it's very convenient to set it to false. (Note: the app verifies that the request is coming from twilio by checking if it’s signed with your auth token, which only you and twilio are supposed to know.)

* `staticFiles` (optional): an object configuring if/how the returned express app should serve static files to twilio. Serving audio files in a cache friendly way is a common need in IVR systems and this library can help with that. See the [static files section](#static-files-config) for the keys allowed here.

## States

The concept of a "state", in the [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) sense of the term, is at the heart of this library. It allows you to describe your call system as a set of states, each of which can transition to other states depending on input from the caller (or on information from outside the call, like the time of day etc).

### Anatomy of a State

A state is just an object (a [POJO](https://www.quora.com/What-is-a-plainObject-in-JavaScript/answer/Alex-Giannakakos) is fine). This library defines some properties/methods that a state can have, which affect how it's handled (e.g. how the library will pass it input). The allowed properties are:

- `twimlFor(urlFor, inputData?)` (optional): a function that returns the [Twiml](https://www.twilio.com/docs/api/twiml) used to "render" the state to the caller. For example, the caller might be on a state that asks them to choose from a list of options. To present those options to the caller, your application has to provide some Twiml (probably using [`<Say>`](https://www.twilio.com/docs/api/twiml/say) or [`<Play>`](https://www.twilio.com/docs/api/twiml/play)) to read out the options. This function would be responsible for returning that Twiml. States with a `twimlFor` property are called **renderable states**.

- `transitionOut(inputData?)` (optional): a function that's called to determine the next state. States with a `transitionOut` function are called **branching states**. A state's `transitionOut` function is usually called in response to caller input, or to a new call coming in, and receives that input data. However, it can also be called indirectly; see below. It returns the next state, or a promise for the next state.

- `backgroundTrigger(urlFor, inputData?)` (optional): a function called just before the state is rendered (`backgroundTrigger` is only available on renderable states). This function can be used to kick off background operations that should happen as a result of reaching this state. Note: this function does not block rendering the state, so `twimlFor` should not assume that anything `backgroundTrigger` does has been completed at render time. (`backgroundTrigger` may be given the ability to block, or to be used on non-renderable states, in the future.) States with a `backgroundTrigger` function are called **asynchronous states**.

- `uri` (optional): most states will *not* have a `uri` property; this property is used primarily on your system's "entry state" (i.e., the state that twilio will use to start a call, likely through the incoming call webhook). However, if there are other states that you need to be able to "jump to" directly (i.e., point twilio to, and have it [continue an existing call from there](https://www.twilio.com/docs/api/rest/change-call-state)) those must also have a `uri`. The `uri` property should hold a relative uri string that will be used by the library to create an express `POST` listener that, when requested, consults the state to figure out how to respond. States with a `uri` property are called **routable states**.

- `processTransitionUri` (optional): a relative uri where caller input data should be sent; data sent to this uri will be passed to the state's `transitionOut` method to determine the next state. (The `processTransitionUri` only applies states that are branching and renderable.) Like `uri`, the uri given here is turned into an express `POST` listener by the library. A state's `twimlFor()` method should render twiml that instructs twilio to send the relevant user input data to the `processTransitionUri` (see examples below). States with a `processTransitionUri` property, which are also renderable and branching states, are called **normal states** as they tend to be the most common state type.

- `isEndState` (optional): this property, if present, can only have one value: `true`. It's used to mark a state as an **end state** of your call (see below).

- `name` (optional): a string that uniquely identifies the state (among all your states). Will be used in the logs for easier debugging.

### Valid States

As you can see, almost all properties on a state are optional, and many of the properties can be used together to create states with interesting behaviors. However, not all combinations are valid. Below are all the valid combinations, with an example of where you might use each:

### End States (Routable or Not)
An End State is a renderable state that doesn't branch to anywhere else. As its name would suggest, an end state is (almost?) always the last state in your call. Here's an example end state that just hangs up, which is common behavior:

```js
var endState = {
  name: "END_STATE",
  isEndState: true,
  twimlFor() {
    // If you don't want to built raw XML, you can also return a TwimlResponse
    // to simplify this. See https://twilio.github.io/twilio-node/
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Hangup />
      </Response>`;
  }
}
```

The end state above isn't routable (i.e., other states can transition to it, but it doesn't have an HTTP endpoint that twilio can request directly to render it). That's usually what you want in your end state. If, however, you wanted to be able to [hijack a running call](https://www.twilio.com/docs/api/rest/change-call-state) to render an error message after some external condition had failed, you could have a routable end state like this:

```js
var endStateRoutable = {
  name: "UNKNOWN_ERROR",
  uri: "/unknown-error",
  isEndState: true,
  twimlFor() {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An unknown error has occurred. Please leave us a message after the beep.</Say>
        <Record />
      </Response>`
  }
}
```

Once registered with the library, this state would result in the creation of a `POST /unknown-error` endpoint that you could redirect the running call to, and that would render the above Twiml.

### Normal States (Routable or Not)
Most states in your system will probably be normal states, as they have all the machinery for playing something to the user, gathering input, and deciding what to do based on that input.

Below is an example of two normal states, one routable and one not, that, with the end state above, could form a simple IRV system:

```js
// Note the `uri` in the (routable) entry state below, which will produce a
// POST /incoming-call endpoint that we can use as our twilio webhook handler.
var entryState = {
  name: "CALL_RECEIVED",
  uri: "/incoming-call",
  processTransitionUri: "/incoming-call-transition-out",

  twimlFor() {
    // Below, we use <Gather>'s action attribute, (and the <Redirect> for the case
    // that the Gather times out) to send the user input to the `processTransitionUri`.
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Gather action="${entryState.processTransitionUri}">
          <Say>Welcome to Foo Corp! To hear our lunch specials press one. For our hours, press two.</Say>
        </Gather>
        <Redirect method="POST">${entryState.processTransitionUri}</Redirect>
      </Response>`;
  },

  // Process the input to return the next state.
  // On no/invalid input, play the same state so the caller can try again.
  transitionOut(inputData) {
    let inputDigit = (inputData.Digits || [])[0];

    switch(inputDigit) {
      case "1":
        return lunchSpecialsState;
      case "2":
        return hoursState;
      default:
        return entryState;
    }
  }
}

// By contrast, here's a normal state that's not routable, meaning it has no `uri`.
// It can be pointed to by other states' transitionOut, but never rendered directly by twilio.
var lunchSpecialsState = {
  name: "LUNCH_SPECIALS",
  processTransitionUri: "/lunch-specials-transition-out",
  twimlFor() {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Gather action="${lunchSpecialsState.processTransitionUri}">
          <Say>Our lunch special is a hamburger.</Say>
          <Say>If you want to now hear our our hours, press one.</Say>
        </Gather>
        <Redirect method="POST">${lunchSpecialsState.processTransitionUri}</Redirect>
      </Response>`;
  },
  transitionOut(inputData) {
    let inputDigit = (inputData.Digits || [])[0];

    // Play hours if the user enters one.
    // Otherwise, hang up (using our end state from earlier).
    return inputDigit === "1" ? hoursState : endState;
  }
}

var hoursState = {/* left as an exercise to the reader. */ };
```

### Non-Renderable Branching States (Routable or Not)
So far, all the branching states (i.e. those with a `transitionOut`) that we've seen have been renderable. But, sometimes, you want to branch based on something other than a prompt you render to the caller. One example might be determining the next state based on the time of day:

```js
var branchingState = {
  name: "CHECK_IF_MORNING",
  transitionOut() {
    return (new Date()).getHours() < 12 ? callFrontDesk : recordVoicemail;
  }
}
```

The above state isn't routable but, if you wanted this check to happen as the first thing when when a call comes in, you could make it routable (by adding a `uri` member) and use it as the entry state/twilio webhook destination.

### Asynchronous States (Routable or Not)
Asynchronous states are used when you need to kick something off in the background before rendering the state. Below is an example of an asynchronous state that performs a slow lookup of the weather while the user is told to wait. Then, if the lookup succeeds, it redirects the user to a state that reads the weather; otherwise, it redirects to an error state.

```js
var lookupWeatherState = {
  name: "LOOKUP_WEATHER",
  twimlFor() {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're looking up the weather. Please hold on.</Say>
      </Response>`
  },
  backgroundTrigger(urlFor) {
    lookupWeather().then(weather => {
      // save weather in the call session, and use twilio's rest api
      // to redirect this call to a state that will play the weather.
    }, error => {
      // the lookup failed, so use twilio's rest api to redirect the call
      // to (e.g.) the routable UNKNOWN_ERROR end state we made earlier.
    });
  }
};
```

The above asynchronous state isn't routable, but, like with the example non-renderable branching state, it would be easy to make it routable if you wanted to use it as the entry state to your call.

## Other Features

### Static files and urlFor
It's very likely that, at some point, you'll want to play a recording to the caller, which you can do by pointing to an audio file in your Twiml. When twilio requests your audio file, you'll want to ensure that your HTTP response includes headers telling twilio to cache the file; if you don't, twilio will have to download and transcode the audio file every time it's played, and your callers will experience a delay before the audio starts. In addition, if/when you update your audio with a new recording, you'll want to force twilio to pick up and use the new version right away.

The common way to handle both these needs is to set far-future `Expires`/`Cache-Control` headers on your static file responses, and then bust the cache by updating the url when the file changes. This technique is explained [here](https://maanasroyy.wordpress.com/2012/05/05/apache-performance-tuning-use-a-far-future-expires-header/).

The twilio-ivr library makes it really easy to do this. First, you provide a few options in your [static files configuration](#static-files-config) (described below). Then, use the `urlFor` function, passed by the library as the first argument to `twimlFor` and `backgroundTrigger`, to generate urls for your static files that automatically have a query parameter whose value will change every time the file is changed, to bust the cache. These are called "fingerprinted urls".

For example:

```js
var playAudioState = {
  twimlFor(urlFor) {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play>${ urlFor("/intro.mp3") }</Play>
      </Response>`
  }
};
```

Above, the urlFor call will generate a fingerprinted url like: `/intro.mp3?v=16acf2382173d....`. Note: the argument to the urlFor function is the public url to your static file (not its path on disk), just without the version parameter.

> Note: cache busting using a query parameter is generally not as reliable as cache-busting by changing the non-query part of the URL, because not all caches include the query parameters in their cache keys. However, twilio's cache does, and that's the only cache we care about.

The `urlFor` function optionally takes other [options](https://github.com/ethanresnick/twilio-ivr/blob/master/lib/index.d.ts#L25), including whether to make the generated url absolute (which twilio needs in some cases) and an object of query parameters to add to the generated url.

<a id="static-files-config"></a>Below are the options you can provide under the `staticFiles` key of the config object, to get the functionality described above:

  * `path` or `fingerprintUrl`. If you're using the library's static file handling at all, you must provide **one and only one** of these:
    * `path`: an *absolute path* to the folder on disk containing your static files. If this is provided, the library will automatically scan that directory when your app is started and generate a fingerprint for each file, which will then be used to generate urls by the `urlFor` function.
    * `fingerprintUrl`: a function that takes an unfingerprinted (root-relative) url for a static file, and returns the fingerprinted version. If provided, this function will be used by the `urlFor` function to generate the fingerprinted urls. Only use this option if you can't use `path` for some reason. Possible reasons: your static files are not located on disk, but are retreived over the network; or, your static files change while the app is running, and you need the fingerprints to be regenerated without restarting the app.

  * `mountPath` (optional, empty by default): a path segment that will be used as a prefix in the urls for your static files. For example, if you have a static file called `intro.mp3` and you want it served at `https://example.com/static/intro.mp3`, you'd set `mountPath` to `/static`. If this is provided, it should be a string starting with a `/`.

  * `middleware` (**required if `fingerprintUrl` is used**; optional otherwise): an express middleware that will be used to actually serve the static files and set the appropriate caching headers. By default, the library will just use the `path` option to find your files on disk and serve them with the appropriate headers. But, if `fingerprintUrl` is set, the library doesn't know where those files are, so you must provide this middleware yourself. Even if `path` is set, you can provide a custom middleware if you want to override the library's behavior.

  * `holdMusic` (optional): an object containing keys specifically related to setting up the [hold music endpoint](#hold-music); if not provided, no hold music endpoint will be created.
    * `fileRelativeUri` (**required**, if the holdMusic object is present): the URI of your hold music audio file, *relative to/excluding the base URI where all your static files are served from*. So, if your static files are served out of `https://example.com/static`, and your hold music file is at `https://example.com/static/hold.mp3`, you'd set this option to `hold.mp3` (or `./hold.mp3`).
    * `endpoint` (optional, defaults to `/hold-music`): the uri to use for the hold music endpoint. This uri will be nested under the static files mount path if one is provided. I.e., if the mountPath is `/static` and the endpoint is `/hold-music`, the full hold music uri will `/static/hold-music`.
    * `twimlFor(urlFor)` (optional): a function you can provide to override the built-in logic for generating the hold music endpoint's Twiml.

### Hold Music
[Coming Soon]

### Call Sessions
[Coming Soon]

# twilio-ivr

This library makes it easy to build a phone tree/[IVR](https://en.wikipedia.org/wiki/Interactive_voice_response) system using twilio. 

# States
The concept of a "state", in the [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine) sense of the term, is at the heart of this library. It allows you to describe your call system as a set of states, each of which can transition to other states depending on input from the caller (or on information from outside the call, like the time of day etc).

The library exports one primary function, which takes all of your states and returns an express [app](http://expressjs.com/en/4x/api.html#app) that can handle all HTTP requests needed to interact with twilio to make your call work.

## Anatomy of a State

A state is just an object (a [POJO](https://www.quora.com/What-is-a-plainObject-in-JavaScript/answer/Alex-Giannakakos) is fine). This library defines some properties/methods that a state can have, which affect how it's handled (e.g. how the library will pass it input). The allowed properties are:

- `name` (**required**): a string that uniquely identifies the state (among all your states).

- `twimlFor(callSession, urlFor, inputData?)` (**optional**): a function that returns the [Twiml](https://www.twilio.com/docs/api/twiml) used to "render" the state to the caller. For example, the caller might be on a state that asks them to choose from a list of options. To present those options to the caller, your application has to provide some Twiml (probably using [`<Say>`](https://www.twilio.com/docs/api/twiml/say) or [`<Play>`](https://www.twilio.com/docs/api/twiml/play)) to read out the options. This function would be responsible for returning that Twiml. States with a `twimlFor` property are called **renderable states**.

- `transitionOut(callSession, inputData?)` (**optional**): a function that's called to determine the next state. States with a `transitionOut` function are called **branching states**. A state's `transitionOut` function is usually called in response to caller input, or to a new call coming in, and receives that input data. However, it can also be called indirectly; see below. It returns a promise for the next state and any updates to the call session (also described below).

- `backgroundTrigger(callSession, urlFor, inputData?)` (**optional**): a function called just before the state is rendered (`backgroundTrigger` is only available on renderable states). This function can be used to kick off background operations that should happen as a result of reaching this state. Note: this function does not block rendering the state, so `twimlFor` should not assume that anything `backgroundTrigger` does has been completed at render time. (`backgroundTrigger` may be given the ability to block, or to be used on non-renderable states, in the future.) States with a `backgroundTrigger` function are called **asynchronous states**.

- `uri` (**optional**): most states will *not* have a `uri` property; this property is used primarily on your system's "entry state" (i.e., the state that twilio will use to start a call, likely through the incoming call webhook). However, if there are other states that you need to be able to "jump to" directly (i.e., point twilio to, and have it [continue an existing call from there](https://www.twilio.com/docs/api/rest/change-call-state)) those must also have a `uri`. The `uri` property should hold a relative uri string that will be used by the library to create an express `POST` listener that, when requested, consults the state to figure out how to respond. States with a `uri` property are called **routable states**.

- `processTransitionUri` (**optional**): a relative uri where caller input data should be sent; data sent to this uri will be passed to the state's `transitionOut` method to determine the next state. (The `processTransitionUri` only applies states that are branching and renderable.) Like `uri`, this property is used by the library to set up the appropriate express POST listeners. States with a `processTransitionUri` property, which are also renderable and branching states, are called **normal states** as they tend to be the most common state type.

- `isEndState` (**optional**): this property, if present, can only have one value: `true`. It's used to mark a state as an **end state** of your call (see below).

## Valid States

As you can see, almost all properties on a state are optional, and many of the properties can be used together to create states with interesting behaviors. However, not all combinations are valid. Below are all the valid combinations, with an example of where you might use each:

### End States (Routable or Not)
An End State is a renderable state that doesn't branch to anywhere else. As its name would suggest, an end state is (almost?) always the last state in your call. Here's an example end state that just hangs up, which is common behavior:

```js
var endState = {
  name: "END_STATE",
  isEndState: true,
  twimlFor() { 
    // If you don't want to built raw XML, you can also return a TwimlResponse object
    // to simplify this. See https://twilio.github.io/twilio-node/
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Hangup />
      </Response>`;
  }
}
```

The end state above isn't routable (i.e., other states can transition to it, but twilio can't get to it directly to render it). That's usually what you want in your end state. If, however, you wanted to be able to [hijack a running call](https://www.twilio.com/docs/api/rest/change-call-state) to render an error message after some external condition had failed, you could have a routable end state like this:

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
  
  // Process the input to return a promise for the next state
  // (and the updated callSession, which we're ignoring for now).
  // On no/invalid input, redirect to same state so the caller can try again.
  transitionOut(callSession, inputData) {
    let inputDigit = (inputData.Digits || [])[0];
    
    if(inputDigit === "1") {
      return Promise.resolve([callSession, lunchSpecialsState]);
    } else if(inputDigit === "2") {
      return Promise.resolve([callSession, hoursState]);
    } else {   
      return Promise.resolve([callSession, entryState]);
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
  transitionOut(callSession, inputData) {
    // Play hours if the user enters one. Otherwise, hang up (using our end state from earlier).
    return Promise.resolve(
      (inputData.Digits || [])[0] === "1" ? [callSession, hoursState] : [callSession, endState]
    );
  } 
}

var hoursState = {/* left as an exercise to the reader. */ };
```

### Non-Renderable Branching States (Routable or Not)
So far, all the branching states (i.e. those with a `transitionOut`) that we've seen have been renderable. But, sometimes, you want to branch based on something other than a prompt you render to the caller. One example might be determining the next state based on the time of day:

```js
var branchingState = {
  name: "CHECK_IF_MORNING",
  transitionOut(callSession) {
    return Promise.resolve([callSession, (new Date()).getHours() < 12 ? callFrontDesk : recordVoicemail]); 
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
  backgroundTrigger(callSession, urlFor) {
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

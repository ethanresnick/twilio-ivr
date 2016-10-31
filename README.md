# twilio-ivr

This library makes it easy to build a phone tree/[IVR](https://en.wikipedia.org/wiki/Interactive_voice_response) system using twilio. 

It allows you to describe your call system as a set of states, each of which can transition to other states depending on input from the caller (or on information from outside the call, like the time of day etc). The model is roughly that of a [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine), and the library uses the word "state" in the FSM sense.

The library exports one primary function, which takes all of your states and returns an express [app](http://expressjs.com/en/4x/api.html#app) that can handle all HTTP requests needed to interact with twilio to make your call work.

## Anatomy of a State

A state is just an object (a [POJO](https://www.quora.com/What-is-a-plainObject-in-JavaScript/answer/Alex-Giannakakos) is fine). This library defines some properties/methods that a state can have, which affect how it's handled (e.g. how the library will pass it input). The allowed properties are:

- `name` (**required**): a string that uniquely identifies the state (among all your states).

- `twimlFor` (**optional**): a function that returns the [Twiml](https://www.twilio.com/docs/api/twiml) used to "render" the state to the caller. For example, the caller might be on a state that asks them to choose from a list of options. To present those options to the caller, your application has to provide some Twiml (probably using [`<Say>`](https://www.twilio.com/docs/api/twiml/say) or [`<Play>`](https://www.twilio.com/docs/api/twiml/play)) to read out the options. This function would be responsible for returning that Twiml. tates with a `twimlFor` property are called **renderable states**.

- `transitionOut` (**optional**): a function that's called to determine the next state. States with a `transitionOut` function are called **branching states**. A state's `transitionOut` function is usually called in response to caller input, or to a new call coming in, and receives that input data. However, it can also be called indirectly; see below.

- `backgroundTrigger` (**optional**): a function called just before the state is rendered (`backgroundTrigger` is only available on Renderable States). This function can be used to kick off background operations that should happen as a result of reaching this state. Note: this function does not block rendering the state, so `twimlFor` should not assume that anything `backgroundTrigger` does has been completed at render time. (`backgroundTrigger` may be given the ability to block, or to be used on non-renderable states, in the future.) States with a `backgroundTrigger` are called **asynchronous states**.

- `uri` (**optional**): most states will *not* have a `uri` property; this property is used primarily on your system's "entry state" (i.e., the state that twilio will use to start a call, likely through the incoming call webhook). However, if there are other states that you need to be able to "jump to" directly (i.e., point twilio to, and have it [continue an existing call from there](https://www.twilio.com/docs/api/rest/change-call-state)) those must also have a `uri`. The `uri` property should hold a relative uri string that will be used by the library to create an express `POST` listener that, when requested, consulst the state to figure out how to respond.

- `processTransitionUri` (**optional**): a relative uri where caller input data should be sent; data sent to this uri will be passed to the state's `transitionOut` method to determine the next state. (The `processTransitionUri` only applies states that are branching and renderable.) Like `uri`, this property is used by the library to set up the appropriate express POST listeners.

- `isEndState` (**optional**): this property, if present, can only have one value: `true`. It's used to mark a state as an end state of your call. An end state is a renderable state that doesn't branch anywhere else. Most commonly, your end state(s) will just render the Twiml: `<Hangup />`.

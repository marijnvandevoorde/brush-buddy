# Compliance questionnaires — prepared answers

Every answer below follows from one fact: the app ships the whole experience
inside the binary, has no network access, and stores only a streak, a star count
and a few preferences in local storage. Verify each against the build before
submitting — you are the one signing the declaration.

Two things differ from Math Adventure, and both change an answer:

1. **Brush Buddy declares one permission, `VIBRATE`.** Math Adventure declares
   none. Play cross-checks the declared permission list against these answers,
   so do not copy Math Adventure's "no permissions" wording verbatim.
2. **It sits in Health & Fitness, not Education.** That changes the IARC
   category and surfaces the Health apps declaration.

---

## Google Play — Data safety

**Grow → Store presence → Data safety**

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | N/A (nothing is collected or transmitted) |
| Do you provide a way for users to request that their data be deleted? | N/A (no data is collected) |

The streak, star count, chosen colour scheme, chosen buddy and language live in
WebView local storage on the device. Play does **not** count on-device-only
storage as collection, so "No" is correct — collection means transmission off
the device, which cannot happen without the `INTERNET` permission.

Play may still ask you to confirm the app has no ads library and no analytics —
it has neither.

## Google Play — Advertising ID declaration

**No**, the app does not use an advertising ID. (No `AD_ID` permission is
declared in the manifest.)

## Google Play — Permissions declaration

The manifest declares exactly one permission:

| Permission | Why |
| --- | --- |
| `android.permission.VIBRATE` | A short buzz when the timer moves to the next part of the mouth, so the cue lands when the phone is face-down on the sink. |

`VIBRATE` is a normal (not dangerous) permission — there is no runtime prompt
and no sensitive-permission declaration form to complete. No sensitive
permissions (location, camera, microphone, contacts, storage, `QUERY_ALL_PACKAGES`)
are requested.

## Google Play — Content rating (IARC questionnaire)

Category: **Utility, Productivity, Communication, or Other**

| Question | Answer |
| --- | --- |
| Violence, sexuality, language, controlled substances, crude humour | No to all |
| Gambling or simulated gambling | No |
| Does the app share the user's location with other users? | No |
| Does the app allow users to interact or exchange content? | No |
| Does the app allow the purchase of digital goods? | No |
| Does the app contain ads? | No |

Expected outcome: PEGI 3 / ESRB Everyone / USK 0.

## Google Play — Target audience and content

- Target age groups: **Under 5** and **6–8**. Brush Buddy is aimed at young
  children brushing with a parent nearby.
- Because children are a target audience the app enters the **Families
  programme**. It must meet the Families policy — it does: no ads, no data
  collection, no external links, no social features — and it needs a privacy
  policy URL, which is set.
- The store listing must not contain a call to action aimed at children. The
  prepared copy addresses parents throughout.
- Because the target audience includes children under 13, the app must not use
  an advertising ID. It does not.

## Google Play — Health apps declaration

**Not a health app** in Play's sense. Brush Buddy is a timer with an animated
mascot. It does not:

- access Health Connect or any health/fitness API,
- record, store or transmit any health data,
- provide medical advice, diagnosis, or treatment,
- claim any clinical outcome.

The two-minute duration and the even split across the mouth are general dental
hygiene guidance, presented as such. If Play asks whether the app provides
medical or health-related functionality, the answer is **No**.

Being listed under the Health & Fitness *category* does not by itself trigger
the health declarations — those key off health data access and medical claims.

## Google Play — Government apps / financial features

No to all.

## Google Play — News app

No.

## Google Play — Data deletion

Not applicable: no account exists and no data is held off-device. Uninstalling
removes everything the app has stored.

---

## App Store — App Privacy ("nutrition label")

**App Store Connect → App Privacy**

Answer: **"Data Not Collected"** for every category. That single choice produces
the "Data Not Collected" label and skips all follow-up questions.

## App Store — Age rating

Answer **None / No** to every content question. Expected outcome: **4+**.

| Question | Answer |
| --- | --- |
| Made for Kids? | **Yes — Ages 5 and under** (see note) |
| Unrestricted web access | No |
| Gambling | No |

> Opting into the Kids Category brings extra Apple requirements (no external
> links without a parental gate, no third-party analytics or advertising). Brush
> Buddy meets all of them already, but the choice is worth making deliberately
> rather than by default.

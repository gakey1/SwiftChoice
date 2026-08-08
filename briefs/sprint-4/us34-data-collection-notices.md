# US34, data-collection notices: what to write and where

I am picking this one up rather than leaving it. This file is the spec I am building from, so anyone reading it can check the wording against what the app actually does.

The WBS splits US34 into three: a short notice wherever we collect something, a notice when something goes to an outside service, and working links to a privacy policy and terms.

## What the app actually does

This is the whole list. Nothing else leaves the phone.

| Data | Where it goes | When |
|------|---------------|------|
| An accepted decision | Your account in the cloud | Every time you press Accept |
| Your location, or a suburb you typed | Google, to find places near you | Every Eat Out search |
| Your location | A weather service, to check conditions | **Every Focus recommendation** |

Everything else stays on the device: preferences, the pools, decision history, XP and level, theme, avatar, and the two-factor key.

**The Focus row changed on 8 August.** It used to be outdoor spots only. It is now every Focus result, because you travel to an indoor spot too. Any wording written against the old behaviour is wrong.

## The four notices

### 1. Eat Out search

Where: on the Eat Out screen, near the area box.

> Finds places near you. Your location, or the area you type, is sent to Google to do it. Nothing about you goes with it.

### 2. Focus recommendation

Where: on the Focus screen, near Find My Spot.

> Checks the weather where you are, so we can tell you if you need a jacket or an umbrella. Your location is sent to a weather service. Nothing about you goes with it.

Not "for outdoor spots". It is every time.

### 3. Accepting a decision

Where: next to Accept, or on the confirmation after it.

> Saved to your history, and copied to your account so it is there on your next sign-in.

This is the only thing that leaves the phone permanently, so it is the one that most deserves saying plainly.

### 4. A summary in Settings

Where: a row in Settings, opening a short screen.

Covers the table above in full, plus the links to the privacy policy and terms.

## Wording rules

**Say exactly what we do, and no more.** I hit this on the clear-data screen: it has to say "on this phone", because the cloud copy of your history survives. Claiming to delete more than we delete would be the fastest way to lose someone's trust on the one screen where they came looking for it.

**Two things not to claim.**

1. Do not say the location is only used for outdoor spots. Not true any more.
2. Do not imply we know where the spot is. A spot has a name but no coordinates, so the weather is for where **your phone** is, not where the spot is. For getting there that is the right answer. For a spot some distance away it is approximate.

**Unobtrusive, per the WBS.** A notice people dismiss without reading is worse than none, because it looks like consent and is not. Small text under the control, not a dialog.

## Still needed

The privacy policy and terms have to exist somewhere reachable for the links to work. That is not written yet and is not a code task.

# Science Partner Meeting Brief

## Purpose

This session is for validating the scientific task behind the application, not collecting general UI polish feedback.

The current working framing is:

> The tool should help researchers identify where seismic demand concentrates in the building, determine whether those concentrations indicate meaningful damage mechanisms, and understand what evidence is strong enough to support retrofit, standards, or code-related conclusions.

## What We Need To Learn

By the end of the meeting, we need clearer answers to these questions:

- What research question or hypothesis are you actually trying to answer with this data?
- What decision or conclusion would this tool help you make?
- What patterns in the building matter most: floor concentration, corner asymmetry, torsion, hinge hotspots, timing of exceedance, or something else?
- When you threshold node drift or hinge demand, what new information does that reveal to you beyond “this exceeded a limit”?
- What would count as convincing evidence versus interesting but non-actionable information?
- How does this analysis connect to your current research outputs, retrofit thinking, or code/standards work?

## Demo Focus

The walkthrough should stay centered on a narrow analysis path:

1. Show where story drift concentrates over time.
2. Show which floors or corners cross thresholds and when.
3. Show whether hinge hotspots support the same interpretation or reveal a different mechanism.

The goal is to learn how the partner interprets those views, not whether they prefer a different tab color or control style.

## Questions To Ask During The Session

- What decision would you make differently if this view were trustworthy?
- What pattern here counts as evidence to you?
- Which floors, corners, or components would you flag first, and why?
- What visual cue told you that?
- What conclusion can you draw from threshold crossing time?
- When hinge data agrees or disagrees with drift patterns, how do you interpret that?
- What are you comparing mentally when you look at this?
- What missing view or metric would make this scientifically useful rather than just descriptive?
- If this tool disappeared, what analysis would become harder, slower, or less defensible?

## Questions To Avoid Until The End

Avoid leading with broad usability prompts such as:

- “Is this accessible?”
- “Do you like this layout?”
- “Should this tab be more obvious?”
- “Do you want a different dropdown/control here?”

Those can be discussed at the end in a short UI pass, after the scientific interpretation questions are answered.

## Desired Outcomes

We want to leave the meeting with:

- A clearer statement of the core scientific task.
- A better understanding of what thresholding is supposed to reveal.
- A ranked sense of which signals matter most.
- A list of missing evidence needed for discovery.
- Enough clarity to trim non-essential parts of the prototype.

## Notes Template

- Primary scientific goal:
- Decision supported by the tool:
- Most meaningful signals:
- What thresholding reveals:
- What counts as evidence:
- Missing views or metrics:
- Features that distracted from interpretation:
- Features that directly supported interpretation:

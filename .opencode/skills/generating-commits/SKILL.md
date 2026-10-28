---
name: generating-commits
description: Generate a commit message based on the current staged changes
---

# create-commit-msg

Describe the workflow and knowledge this skill provides.

# Instructions

Add the current changes for a commit with the

```
git add .
```

After that :

Generate a commit message based on the current staged changes with these requirements:

- Format: Use strictly Conventional Commits (type(scope): description).
- Maximum 72 characters. Technical and concise.
- Provide a detailed explanation of 'why' these changes were made. Use a bulleted list to describe specific technical improvements or logical changes. Avoid stating the obvious (e.g., 'updated file X').
- Tone: Use professional, dry, technical language. No emojis.
- Context: Only analyze the diff between the current changes and the HEAD of the current branch.
- Breaking Changes: If any logic breaks backward compatibility, start a footer section with 'BREAKING CHANGE:' followed by an explanation.
- Structure of the message : I need it in order to be able to copy and paste it and without quotation (", ', ´) marks or any symbol than a bullet to divide each change. Always inside a signle Mardown code block in order to easily copy it using the copy button.

Then commit the message with the results of the above with :

```
git commit -m "(here the message)"
```

DO NOT PUSH ANY CHANGES.

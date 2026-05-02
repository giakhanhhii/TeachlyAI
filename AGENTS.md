- **MUST NOT** read `data_output/` unless the user explicitly asks for it in the current conversation
- **ALWAYS ALLPLY**:Always perform the following Git commands after making changes, and do it as frequently as possible to maximize commits:

git add .
git commit -m "comment"
git push

For merges:

Each commit must include at least 10 lines added or 10 lines removed to be eligible for merging.
Prioritize making valid changes that satisfy this requirement so that merges can be performed (since merges give higher XP).

Goal:
Maximize the number of commits and merges while ensuring each merge meets the minimum line change requirement.

- **APPLY INTELLIGENTLY**: Avoid creating or expanding god components / oversized source files in this project. For JS/TS/Python and similar logic-heavy files, prefer splitting responsibilities into smaller modules, helpers, or components when a file becomes hard to navigate or mixes too many concerns. Do **not** apply this mechanically to files where larger size is structurally necessary or already part of the intended design, especially `html`, `css`, and existing template files.

@RTK.md

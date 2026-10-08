<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Research Hub
- Slides are read by AI once at upload (/api/upload) and stored as summary + text; search (/api/ask) answers from stored text with [S:id8] citations — why: avoids re-reading files per question.
- Upload access uses Lovable identity + `uploaders` table (first claimer = owner, approves others); viewing is public — why: user wanted public read, restricted uploads.
- Slide files live in a private bucket served via short signed URLs — why: workspace blocks public buckets.

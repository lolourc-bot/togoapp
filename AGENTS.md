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

- App is light-only; brand colors/font are applied by src/theme-brand.css, which remaps legacy inline light hex colors (matched via computed rgb style attributes) to brand tokens. Why: hundreds of inline styles; restyle without touching each screen. No theme toggle.
- Use the shared BrandLogo component for app identity and the same uploaded artwork for the favicon; keep institution/user avatars separate because they identify accounts, not the app.

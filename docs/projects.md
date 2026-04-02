# Planning and Tracking with GitHub Projects

This guide explains how the **Blue-Star** team uses [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) to plan and track work across the QR Store©, G.L.S.©, and G.O.S.© initiatives.

## What is a Project?

A GitHub Project is an adaptable table, board, and roadmap that integrates with issues and pull requests. It helps you plan and track work effectively at the user or organization level. You can create and customize multiple views by filtering, sorting, slicing, and grouping your issues and pull requests.

## Getting Started

1. **Create a project** — Open the **Projects** tab on the [Blue-Star repository](https://github.com/balancerockartist-ctrl/Blue-Star) or your organization profile and select **New project**.
2. **Choose a template or start from scratch** — GitHub provides templates for backlogs, roadmaps, and more, or you can begin with a blank project.
3. **Add items** — Link existing issues and pull requests, or create draft issues directly in the project.

For a full walkthrough, see the [Quickstart for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/quickstart-for-projects).

## Recommended Views

| View | Layout | Purpose |
|------|--------|---------|
| **Backlog** | Table | High-density list of all open work items, sorted by priority |
| **Sprint Board** | Board (Kanban) | Visualize in-progress work across columns (To Do → In Progress → Done) |
| **Roadmap** | Roadmap (Timeline) | Plan release milestones for QR Store, G.L.S., and G.O.S. |

You can save and share these views so the whole team sees the same picture. For more information, see [Changing the layout of a view](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/changing-the-layout-of-a-view).

## Custom Fields

GitHub Projects supports custom fields beyond the built-in metadata (assignees, milestones, labels). We recommend the following fields for Blue-Star:

| Field | Type | Description |
|-------|------|-------------|
| **Component** | Single select | Which system the work belongs to: `QR Store`, `G.L.S.`, `G.O.S.` |
| **Priority** | Single select | `Low`, `Medium`, `High`, `Critical` |
| **Target Ship Date** | Date | Expected completion date |
| **Complexity** | Number | Estimated effort (e.g., story points) |
| **Sprint** | Iteration | Week-by-week iteration planning with support for breaks |

You can use up to 50 fields per project. For more details, see [Understanding fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields).

## Staying Up-to-Date

Projects are built from the issues and pull requests you add, creating direct references between the project and your work. Information syncs automatically — when you update an issue's assignee from the project board, the issue itself reflects the change and vice versa.

- **Adding items**: See [Adding items to your project](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project).
- **Editing items**: See [Editing items in your project](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/editing-items-in-your-project).

## Automation

GitHub Projects offers built-in workflows to reduce manual work:

- **Auto-set fields** when items are added or changed.
- **Auto-archive** items that meet certain criteria (e.g., closed for 14 days).
- **Auto-add** items from a repository when they match a filter (e.g., label `bug`).

You can extend automation further with the **GraphQL API** and **GitHub Actions**:

- [Using the built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations)
- [Using the API to manage Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects)
- [Automating Projects using Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)

## Insights and Charts

Use **Insights** to create charts from your project data — filter the default chart or build custom ones to visualize velocity, workload distribution, or component progress. Charts are visible to anyone who can view the project.

For more information, see [About insights for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/viewing-insights-from-your-project/about-insights-for-projects).

## Status Updates

Keep stakeholders informed by posting status updates directly on the project:

- Set a status such as **On track**, **At risk**, or **Off track**.
- Add start dates and target dates.
- Write a summary message (supports Markdown).

Status updates appear in the project's side panel and header. For more information, see [Sharing project updates](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/sharing-project-updates).

## Further Reading

- [About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- [Best practices for Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)
- [Managing project templates in your organization](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-project-templates-in-your-organization)

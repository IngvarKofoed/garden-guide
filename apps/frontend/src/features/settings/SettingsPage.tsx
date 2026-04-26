import { useEffect, useState } from 'react';
import { GARDEN_CONTEXT_MAX_LENGTH } from '@garden-guide/shared';
import { Button, Card, Field, Textarea } from '../../components/ui';
import { useGardenContext, useUpdateGardenContext } from './hooks';

export function SettingsPage() {
  const ctx = useGardenContext();
  const update = useUpdateGardenContext();

  const [draft, setDraft] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (ctx.data) setDraft(ctx.data.context);
  }, [ctx.data]);

  const remote = ctx.data?.context ?? '';
  const dirty = draft !== remote;
  const tooLong = draft.length > GARDEN_CONTEXT_MAX_LENGTH;

  const onSave = () => {
    update.mutate(
      { context: draft },
      {
        onSuccess: (data) => {
          setDraft(data.context);
          setSavedAt(Date.now());
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tell the AI about your garden once. Every care plan it generates
          takes this into account.
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-col gap-5">
          <Field
            label="Garden context"
            htmlFor="garden-context"
            hint="Where you live, climate, soil, microclimate quirks. e.g. “Denmark, USDA zone 7, maritime climate, heavy clay soil, exposed coastal site.”"
            error={tooLong ? `Keep it under ${GARDEN_CONTEXT_MAX_LENGTH} characters.` : undefined}
          >
            <Textarea
              id="garden-context"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Describe your garden in plain prose…"
              className="min-h-[10rem] w-full"
              disabled={ctx.isLoading}
            />
          </Field>

          {ctx.isError && (
            <p className="text-sm text-red-700">
              {(ctx.error as Error).message}
            </p>
          )}
          {update.isError && (
            <p className="text-sm text-red-700">
              {(update.error as Error).message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <p className="text-xs text-muted">
              {update.isPending
                ? 'Saving…'
                : dirty
                  ? `Unsaved changes · ${draft.length}/${GARDEN_CONTEXT_MAX_LENGTH}`
                  : savedAt
                    ? 'Saved.'
                    : `${draft.length}/${GARDEN_CONTEXT_MAX_LENGTH}`}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft(remote)}
                  disabled={update.isPending}
                >
                  Discard
                </Button>
              )}
              <Button
                type="button"
                onClick={onSave}
                disabled={!dirty || tooLong || update.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

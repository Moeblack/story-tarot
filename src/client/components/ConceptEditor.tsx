import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Copy,
  Deck,
  Interpretation,
  Layout,
  SaveConcepts,
  Theme,
} from '../../shared/types';
import { api, errorMessage } from '../api';
import {
  asCopy,
  asDeck,
  asInterpretation,
  asLayout,
  asTheme,
  cloneConcept,
  emptyCopy,
  emptyDeck,
  emptyInterpretation,
  emptyLayout,
  emptyTheme,
} from '../concepts';
import { downloadText } from '../export';
import { useI18n } from '../i18n';
import { uniqueId } from '../random';
import { useApp, type ConceptKind } from '../state';
import { cx, loc, locAlt } from '../util';
import { Accordion, JsonEditor } from './Fields';
import { Modal } from './Modal';
import { CopyForm } from './forms/CopyForm';
import { DeckForm } from './forms/DeckForm';
import { InterpretationForm } from './forms/InterpretationForm';
import { LayoutForm } from './forms/LayoutForm';
import { ThemeForm } from './forms/ThemeForm';

type EditorTab = ConceptKind | 'copy';

const TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: 'decks', label: 'concepts.decks' },
  { id: 'layouts', label: 'concepts.layouts' },
  { id: 'interpretations', label: 'concepts.interpretations' },
  { id: 'themes', label: 'concepts.themes' },
  { id: 'copy', label: 'concepts.copy' },
];

export interface ConceptEditorProps {
  onClose(): void;
}

export function ConceptEditor({ onClose }: ConceptEditorProps) {
  const app = useApp();
  const { t, lang, bilingual } = useI18n();
  const { catalog } = app;

  const [tab, setTab] = useState<EditorTab>('decks');
  const [deckDraft, setDeckDraft] = useState<Deck | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<Layout | null>(null);
  const [interpretationDraft, setInterpretationDraft] = useState<Interpretation | null>(null);
  const [themeDraft, setThemeDraft] = useState<Theme | null>(null);
  const [copyDraft, setCopyDraft] = useState<Copy | null>(null);
  const [dirty, setDirty] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickDraft = useCallback(
    (target: EditorTab, id?: string) => {
      if (!catalog) return;
      if (target === 'decks') {
        const found = catalog.decks.find((item) => item.id === id) ?? catalog.decks[0];
        if (found) setDeckDraft(cloneConcept(found));
      } else if (target === 'layouts') {
        const found = catalog.layouts.find((item) => item.id === id) ?? catalog.layouts[0];
        if (found) setLayoutDraft(cloneConcept(found));
      } else if (target === 'interpretations') {
        const found = catalog.interpretations.find((item) => item.id === id) ?? catalog.interpretations[0];
        if (found) setInterpretationDraft(cloneConcept(found));
      } else if (target === 'themes') {
        const found = catalog.themes.find((item) => item.id === id) ?? catalog.themes[0];
        if (found) setThemeDraft(cloneConcept(found));
      } else {
        setCopyDraft(cloneConcept(catalog.copy));
      }
      setDirty(false);
    },
    [catalog],
  );

  useEffect(() => {
    if (!catalog) return;
    if (tab === 'decks' && !deckDraft) pickDraft('decks', app.deckId);
    else if (tab === 'layouts' && !layoutDraft) pickDraft('layouts', app.layoutId);
    else if (tab === 'interpretations' && !interpretationDraft) pickDraft('interpretations', app.interpretationId);
    else if (tab === 'themes' && !themeDraft) pickDraft('themes', app.themeId);
    else if (tab === 'copy' && !copyDraft) pickDraft('copy');
  }, [
    catalog,
    tab,
    deckDraft,
    layoutDraft,
    interpretationDraft,
    themeDraft,
    copyDraft,
    pickDraft,
    app.deckId,
    app.layoutId,
    app.interpretationId,
    app.themeId,
  ]);

  const draft: Deck | Layout | Interpretation | Theme | Copy | null = useMemo(() => {
    if (tab === 'decks') return deckDraft;
    if (tab === 'layouts') return layoutDraft;
    if (tab === 'interpretations') return interpretationDraft;
    if (tab === 'themes') return themeDraft;
    return copyDraft;
  }, [tab, deckDraft, layoutDraft, interpretationDraft, themeDraft, copyDraft]);

  const draftId = useMemo(() => {
    if (tab === 'decks') return deckDraft?.id ?? '';
    if (tab === 'layouts') return layoutDraft?.id ?? '';
    if (tab === 'interpretations') return interpretationDraft?.id ?? '';
    if (tab === 'themes') return themeDraft?.id ?? '';
    return 'copy';
  }, [tab, deckDraft, layoutDraft, interpretationDraft, themeDraft]);

  const applyJson = useCallback(
    (next: unknown) => {
      if (tab === 'decks') setDeckDraft(asDeck(next));
      else if (tab === 'layouts') setLayoutDraft(asLayout(next));
      else if (tab === 'interpretations') setInterpretationDraft(asInterpretation(next));
      else if (tab === 'themes') setThemeDraft(asTheme(next));
      else setCopyDraft(asCopy(next));
      setDirty(true);
    },
    [tab],
  );

  const save = async (): Promise<void> => {
    let payload: SaveConcepts | null = null;
    if (tab === 'decks' && deckDraft) payload = { deck: deckDraft };
    else if (tab === 'layouts' && layoutDraft) payload = { layout: layoutDraft };
    else if (tab === 'interpretations' && interpretationDraft) payload = { interpretation: interpretationDraft };
    else if (tab === 'themes' && themeDraft) payload = { theme: themeDraft };
    else if (tab === 'copy' && copyDraft) payload = { copy: copyDraft };
    if (!payload) return;
    setBusy(true);
    try {
      const next = await api.saveConcepts(payload);
      app.applyCatalog(next);
      pickDraft(tab, draftId);
      setDirty(false);
      app.notify(`${t('concepts.saved')} ✓`);
    } catch (cause) {
      app.notify(`${t('error.save')}: ${errorMessage(cause)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (): Promise<void> => {
    if (tab === 'copy' || !draftId) return;
    if (!window.confirm(t('concepts.deleteConfirm'))) return;
    setBusy(true);
    try {
      const next = await api.deleteConcept(tab, draftId);
      app.applyCatalog(next);
      if (tab === 'decks') setDeckDraft(null);
      else if (tab === 'layouts') setLayoutDraft(null);
      else if (tab === 'interpretations') setInterpretationDraft(null);
      else setThemeDraft(null);
      setDirty(false);
      app.notify(`${t('concepts.delete')} ✓`);
    } catch (cause) {
      app.notify(`${t('error.save')}: ${errorMessage(cause)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const restoreDefaults = async (): Promise<void> => {
    if (!window.confirm(t('concepts.restoreConfirm'))) return;
    setBusy(true);
    try {
      const next = await api.reset();
      app.applyCatalog(next);
      setDeckDraft(null);
      setLayoutDraft(null);
      setInterpretationDraft(null);
      setThemeDraft(null);
      setCopyDraft(null);
      setDirty(false);
      app.notify(`${t('concepts.restoreDefaults')} ✓`);
    } catch (cause) {
      app.notify(`${t('error.save')}: ${errorMessage(cause)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const createNew = (): void => {
    if (!catalog) return;
    if (tab === 'decks') {
      setDeckDraft(emptyDeck(uniqueId('custom-deck', catalog.decks.map((item) => item.id))));
    } else if (tab === 'layouts') {
      setLayoutDraft(emptyLayout(uniqueId('custom-layout', catalog.layouts.map((item) => item.id))));
    } else if (tab === 'interpretations') {
      setInterpretationDraft(
        emptyInterpretation(uniqueId('custom-interpretation', catalog.interpretations.map((item) => item.id))),
      );
    } else if (tab === 'themes') {
      setThemeDraft(emptyTheme(uniqueId('custom-theme', catalog.themes.map((item) => item.id))));
    } else {
      setCopyDraft(emptyCopy());
    }
    setDirty(true);
  };

  const duplicate = (): void => {
    if (!catalog || !draft) return;
    if (tab === 'decks' && deckDraft) {
      setDeckDraft(
        cloneConcept({ ...deckDraft, id: uniqueId(`${deckDraft.id}-copy`, catalog.decks.map((item) => item.id)) }),
      );
    } else if (tab === 'layouts' && layoutDraft) {
      setLayoutDraft(
        cloneConcept({ ...layoutDraft, id: uniqueId(`${layoutDraft.id}-copy`, catalog.layouts.map((item) => item.id)) }),
      );
    } else if (tab === 'interpretations' && interpretationDraft) {
      setInterpretationDraft(
        cloneConcept({
          ...interpretationDraft,
          id: uniqueId(`${interpretationDraft.id}-copy`, catalog.interpretations.map((item) => item.id)),
        }),
      );
    } else if (tab === 'themes' && themeDraft) {
      setThemeDraft(
        cloneConcept({ ...themeDraft, id: uniqueId(`${themeDraft.id}-copy`, catalog.themes.map((item) => item.id)) }),
      );
    } else {
      return;
    }
    setDirty(true);
  };

  const exportDraft = (): void => {
    if (!draft) return;
    downloadText(JSON.stringify(draft, null, 2), `${draftId || 'concept'}.json`, 'application/json');
  };

  const importFile = async (file: File): Promise<void> => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      applyJson(parsed);
      app.notify(`${t('concepts.import')} ✓`);
    } catch (cause) {
      app.notify(`${t('error.import')}: ${errorMessage(cause)}`, 'error');
    }
  };

  const itemLabel = (name: { zh: string; ja: string } | undefined): string => {
    const primary = loc(name, lang);
    const secondary = bilingual ? locAlt(name, lang) : '';
    return secondary ? `${primary} · ${secondary}` : primary;
  };

  const items = useMemo(() => {
    if (!catalog) return [];
    if (tab === 'decks') return catalog.decks.map((item) => ({ id: item.id, name: item.name, custom: app.isCustom('decks', item.id) }));
    if (tab === 'layouts') return catalog.layouts.map((item) => ({ id: item.id, name: item.name, custom: app.isCustom('layouts', item.id) }));
    if (tab === 'interpretations')
      return catalog.interpretations.map((item) => ({ id: item.id, name: item.name, custom: app.isCustom('interpretations', item.id) }));
    if (tab === 'themes') return catalog.themes.map((item) => ({ id: item.id, name: item.name, custom: app.isCustom('themes', item.id) }));
    return [{ id: 'copy', name: undefined, custom: false }];
  }, [catalog, tab, app.isCustom]);

  return (
    <Modal
      wide
      title={t('concepts.title')}
      onClose={onClose}
      className="editor-modal"
      footer={
        <div className="button-row">
          <button type="button" className="button is-primary" disabled={busy || !draft} onClick={() => void save()}>
            {t('concepts.save')}
          </button>
          <button type="button" className="button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      }
    >
      <div className="editor">
        <nav className="editor-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx('editor-tab', tab === item.id && 'is-active')}
              onClick={() => setTab(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="editor-body">
          <aside className="editor-list">
            <ul className="editor-items">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cx('editor-item', draftId === item.id && 'is-active')}
                    onClick={() => pickDraft(tab, item.id)}
                  >
                    <span className="editor-item-name">{itemLabel(item.name)}</span>
                    <span className={cx('editor-item-badge', item.custom && 'is-custom')}>
                      {item.custom ? t('concepts.customBadge') : t('concepts.defaultBadge')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="editor-item-actions">
              <button type="button" className="button" disabled={!catalog} onClick={createNew}>
                {t('concepts.new')}
              </button>
              <button type="button" className="button" disabled={!draft || tab === 'copy'} onClick={duplicate}>
                {t('concepts.duplicate')}
              </button>
              <button
                type="button"
                className="button is-danger"
                disabled={!draft || tab === 'copy' || !app.isCustom(tab, draftId)}
                onClick={() => void removeItem()}
              >
                {t('concepts.delete')}
              </button>
              <button type="button" className="button" disabled={!draft} onClick={exportDraft}>
                {t('concepts.export')}
              </button>
              <button type="button" className="button" onClick={() => fileInput.current?.click()}>
                {t('concepts.import')}
              </button>
              <button type="button" className="button is-danger" onClick={() => void restoreDefaults()}>
                {t('concepts.restoreDefaults')}
              </button>
              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.target.value = '';
                }}
              />
            </div>

            {tab !== 'copy' && draftId && app.isCustom(tab, draftId) ? (
              <p className="panel-hint">{t('concepts.overrideHint')}</p>
            ) : null}
          </aside>

          <div className="editor-main">
            {dirty ? <p className="editor-dirty">{t('concepts.unsaved')}</p> : null}

            {tab === 'decks' && deckDraft ? (
              <DeckForm
                value={deckDraft}
                onChange={(next) => {
                  setDeckDraft(next);
                  setDirty(true);
                }}
              />
            ) : null}

            {tab === 'layouts' && layoutDraft ? (
              <LayoutForm
                value={layoutDraft}
                onChange={(next) => {
                  setLayoutDraft(next);
                  setDirty(true);
                }}
              />
            ) : null}

            {tab === 'interpretations' && interpretationDraft ? (
              <InterpretationForm
                value={interpretationDraft}
                onChange={(next) => {
                  setInterpretationDraft(next);
                  setDirty(true);
                }}
              />
            ) : null}

            {tab === 'themes' && themeDraft ? (
              <ThemeForm
                value={themeDraft}
                onChange={(next) => {
                  setThemeDraft(next);
                  setDirty(true);
                }}
              />
            ) : null}

            {tab === 'copy' && copyDraft ? (
              <CopyForm
                value={copyDraft}
                onChange={(next) => {
                  setCopyDraft(next);
                  setDirty(true);
                }}
              />
            ) : null}

            {draft ? (
              <Accordion
                open={advanced}
                onToggle={() => setAdvanced((value) => !value)}
                title={t('concepts.advancedJson')}
                meta={<code>{draftId}</code>}
              >
                <JsonEditor value={draft} onChange={applyJson} />
              </Accordion>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

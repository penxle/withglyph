<script lang="ts">
  import './toolbar-preview.css';

  import IconLetterSpacing from '~icons/glyph/letter-spacing';
  import IconLineHeight from '~icons/glyph/line-height';
  import IconBold from '~icons/tabler/bold';
  import IconCheck from '~icons/tabler/check';
  import IconChevronDown from '~icons/tabler/chevron-down';
  import IconCode from '~icons/tabler/code';
  import IconItalic from '~icons/tabler/italic';
  import IconSettings from '~icons/tabler/settings';
  import IconStrikethrough from '~icons/tabler/strikethrough';
  import IconUnderline from '~icons/tabler/underline';
  import { Icon } from '$lib/components';
  import ColorPicker from '$lib/components/ColorPicker.svelte';
  import { Menu, MenuItem } from '$lib/components/menu';
  import { createFloatingActions, portal } from '$lib/svelte/actions';
  import { values } from '$lib/tiptap/values';
  import { css } from '$styled-system/css';
  import { center, flex } from '$styled-system/patterns';
  import { getEditorContext } from './context';
  import ToolbarButton from './ToolbarButton.svelte';
  import ToolbarButtonTooltip from './ToolbarButtonTooltip.svelte';

  const { state } = getEditorContext();
  $: editor = $state.editor;

  const menuOffset = 4;

  let colorPickerOpen = false;

  let contentOptionsOpen = false;
  let paragraphIndentOpen = false;
  let paragraphSpacingOpen = false;

  const { anchor, floating } = createFloatingActions({
    placement: 'bottom',
    offset: menuOffset,
  });

  $: currentColor =
    (editor?.getAttributes('font_color').fontColor as string | undefined)?.toUpperCase() ?? values.defaultColor;
</script>

<hr class={css({ border: 'none', width: '1px', height: '12px', backgroundColor: 'gray.150' })} />

<div class={center({ gap: '8px', height: '24px' })}>
  <ToolbarButtonTooltip message="글자 색">
    <button
      class={flex({
        align: 'center',
        gap: '4px',
        paddingY: '2px',
        paddingLeft: '6px',
        paddingRight: '4px',
        height: '24px',
        _hover: { backgroundColor: 'gray.100' },
        _pressed: { backgroundColor: 'gray.100' },
      })}
      aria-pressed={colorPickerOpen}
      type="button"
      on:click={() => (colorPickerOpen = true)}
      use:anchor
    >
      <div style:background-color={currentColor} class={css({ borderRadius: 'full', size: '16px' })} />
      <Icon style={css.raw({ color: 'gray.400' }, colorPickerOpen && { rotate: '[180deg]' })} icon={IconChevronDown} />
    </button>

    {#if colorPickerOpen}
      <div
        class={css({ position: 'fixed', inset: '0', zIndex: '40' })}
        role="button"
        tabindex="-1"
        on:click={() => {
          colorPickerOpen = false;
          editor?.commands.focus();
        }}
        on:keypress={null}
        use:portal
      />
    {/if}

    <div class={css({ zIndex: '50' })} use:floating>
      <ColorPicker
        hex={currentColor}
        bind:open={colorPickerOpen}
        on:input={(event) => {
          const { hex } = event.detail;
          if (hex === values.defaultColor) {
            editor?.commands.unsetFontColor();
          } else {
            editor?.commands.setFontColor(hex);
          }
        }}
      />
    </div>
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="폰트">
    <Menu as="div" offset={11} placement="bottom">
      <button
        slot="value"
        class={flex({
          justify: 'space-between',
          align: 'center',
          gap: '2px',
          marginRight: '2px',
          paddingX: '4px',
          fontSize: '14px',
          fontWeight: 'medium',
          color: 'gray.800',
          width: '132px',
          height: '24px',
          whiteSpace: 'nowrap',
          _hover: { backgroundColor: 'gray.100' },
          _pressed: { backgroundColor: 'gray.100' },
        })}
        aria-pressed={open}
        type="button"
        let:open
      >
        <div>
          {values.fontFamily.find(({ value }) => editor?.getAttributes('font_family').fontFamily === value)?.label ??
            values.fontFamily[0].label}
        </div>
        <Icon style={css.raw({ color: 'gray.400' }, open && { rotate: '[180deg]' })} icon={IconChevronDown} />
      </button>

      {#each values.fontFamily as font (font.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            if (font.value === values.fontFamily[0].value) {
              editor?.chain().focus().unsetFontFamily().run();
            } else {
              editor?.chain().focus().setFontFamily(font.value).run();
            }
          }}
        >
          <span style:font-family={`PNXL_${font.value}`}>
            {font.label}
          </span>
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ fontFamily: font.value }) && { visibility: 'hidden' },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="글자 크기">
    <Menu as="div" menuStyle={css.raw({ maxHeight: '312px', overflowY: 'auto' })} offset={11} placement="bottom">
      <button
        slot="value"
        class={flex({
          justify: 'space-between',
          align: 'center',
          gap: '2px',
          paddingX: '4px',
          fontSize: '14px',
          fontWeight: 'medium',
          width: '64px',
          height: '24px',
          _hover: { backgroundColor: 'gray.100' },
          _pressed: { backgroundColor: 'gray.100' },
        })}
        aria-pressed={open}
        type="button"
        let:open
      >
        {values.fontSize.find(({ value }) => editor?.getAttributes('font_size').fontSize === value)?.label ??
          values.fontSize[4].label}
        <Icon style={css.raw({ color: 'gray.400' }, open && { rotate: '[180deg]' })} icon={IconChevronDown} />
      </button>

      {#each values.fontSize as fontSize (fontSize.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            if (!editor) return;

            if (fontSize.value === 16) {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(fontSize.value).run();
            }
          }}
        >
          {fontSize.label}
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ fontSize: fontSize.value }) && { visibility: 'hidden' },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>
  </ToolbarButtonTooltip>
</div>

<hr class={css({ border: 'none', width: '1px', height: '12px', backgroundColor: 'gray.150' })} />

<div class={center({ gap: '6px' })}>
  <ToolbarButtonTooltip message="굵게">
    <ToolbarButton
      aria-pressed={editor?.isActive('bold')}
      icon={IconBold}
      on:click={() => editor?.chain().focus().toggleBold().run()}
    />
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="기울임">
    <ToolbarButton
      aria-pressed={editor?.isActive('italic')}
      icon={IconItalic}
      on:click={() => editor?.chain().focus().toggleItalic().run()}
    />
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="취소선">
    <ToolbarButton
      aria-pressed={editor?.isActive('strike')}
      icon={IconStrikethrough}
      on:click={() => editor?.chain().focus().toggleStrike().run()}
    />
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="밑줄">
    <ToolbarButton
      aria-pressed={editor?.isActive('underline')}
      icon={IconUnderline}
      on:click={() => editor?.chain().focus().toggleUnderline().run()}
    />
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="코드로 표시">
    <ToolbarButton
      aria-pressed={editor?.isActive('code')}
      icon={IconCode}
      on:click={() => editor?.chain().focus().toggleCode().run()}
    />
  </ToolbarButtonTooltip>
</div>

<hr class={css({ border: 'none', width: '1px', height: '12px', backgroundColor: 'gray.150' })} />

<div class={center({ gap: '8px' })}>
  <ToolbarButtonTooltip message="정렬">
    <Menu as="div" menuStyle={css.raw({ minWidth: '[initial]' })} offset={11} placement="bottom">
      <ToolbarButton
        slot="value"
        aria-pressed={open}
        icon={values.textAlign.find(({ value }) => value === editor?.getAttributes('paragraph').textAlign)?.icon ??
          values.textAlign[0].icon}
        let:open
      />

      {#each values.textAlign as textAlign (textAlign.value)}
        <MenuItem
          style={css.raw({ _pressed: { color: 'brand.400' } })}
          aria-label={textAlign.label}
          aria-pressed={editor?.isActive({ textAlign: textAlign.value })}
          on:click={() => editor?.chain().focus().setParagraphTextAlign(textAlign.value).run()}
        >
          <Icon icon={textAlign.icon} size={24} />
        </MenuItem>
      {/each}
    </Menu>
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="행간">
    <Menu as="div" offset={11} placement="bottom">
      <ToolbarButton slot="value" aria-pressed={open} icon={IconLineHeight} let:open />

      {#each values.lineHeight as lineHeight (lineHeight.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            editor?.chain().focus().setParagraphLineHeight(lineHeight.value).run();
          }}
        >
          {lineHeight.label}
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ lineHeight: lineHeight.value }) && { visibility: 'hidden' },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>
  </ToolbarButtonTooltip>

  <ToolbarButtonTooltip message="자간">
    <Menu as="div" offset={11} placement="bottom">
      <ToolbarButton slot="value" aria-pressed={open} icon={IconLetterSpacing} let:open />

      {#each values.letterSpacing as letterSpacing (letterSpacing.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            editor?.chain().focus().setParagraphLetterSpacing(letterSpacing.value).run();
          }}
        >
          {letterSpacing.label}
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ letterSpacing: letterSpacing.value }) && { visibility: 'hidden' },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>
  </ToolbarButtonTooltip>
</div>

<hr class={css({ border: 'none', width: '1px', height: '12px', backgroundColor: 'gray.150' })} />

<ToolbarButtonTooltip message="본문 설정">
  <Menu as="div" offset={11} placement="bottom" bind:open={contentOptionsOpen}>
    <ToolbarButton slot="value" aria-pressed={open} icon={IconSettings} let:open />

    <Menu as="div" hideBackdrop offset={0} placement="right-start" bind:open={paragraphIndentOpen}>
      <MenuItem
        slot="value"
        data-hover={paragraphIndentOpen}
        on:mouseenter={() => {
          paragraphIndentOpen = true;
          paragraphSpacingOpen = false;
        }}
      >
        문단 들여쓰기
      </MenuItem>

      {#each values.documentParagraphIndent as documentParagraphIndent (documentParagraphIndent.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            contentOptionsOpen = false;
            paragraphIndentOpen = false;
            editor?.commands.setDocumentParagraphIndent(documentParagraphIndent.value);
          }}
        >
          {documentParagraphIndent.label}
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ documentParagraphIndent: documentParagraphIndent.value }) && {
                visibility: 'hidden',
              },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>

    <Menu as="div" hideBackdrop offset={0} placement="right-start" bind:open={paragraphSpacingOpen}>
      <MenuItem
        slot="value"
        data-hover={paragraphSpacingOpen}
        on:mouseenter={() => {
          paragraphIndentOpen = false;
          paragraphSpacingOpen = true;
        }}
      >
        문단 사이간격
      </MenuItem>

      {#each values.documentParagraphSpacing as documentParagraphSpacing (documentParagraphSpacing.value)}
        <MenuItem
          style={flex.raw({ justify: 'space-between', align: 'center', gap: '8px' })}
          on:click={() => {
            contentOptionsOpen = false;
            paragraphSpacingOpen = false;
            editor?.commands.setDocumentParagraphSpacing(documentParagraphSpacing.value);
          }}
        >
          {documentParagraphSpacing.label}
          <Icon
            style={css.raw(
              { 'color': 'brand.400', '& *': { strokeWidth: '[2]' } },
              !editor?.isActive({ documentParagraphSpacing: documentParagraphSpacing.value }) && {
                visibility: 'hidden',
              },
            )}
            icon={IconCheck}
          />
        </MenuItem>
      {/each}
    </Menu>
  </Menu>
</ToolbarButtonTooltip>

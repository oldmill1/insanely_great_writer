require "application_system_test_case"

class FolderWindowShortcutsTest < ApplicationSystemTestCase
  test "dragging folders into shortcuts persists across reloads" do
    chapter = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    scenes = Folder.create!(user: users(:one), name: "Scenes", path: "root/Chapter 1/Scenes")

    sign_in_as(users(:one))
    visit root_path

    open_folder_window(chapter)

    drag_row_to_target(chapter, "Scenes", ".folder-window__main-pane")
    assert_no_sidebar_shortcut(chapter, "Scenes")

    drag_row_to_target(chapter, "Scenes", '[data-folder-browser-target="shortcutDropzone"]')
    assert_sidebar_shortcut(chapter, "Scenes", count: 1)

    drag_row_to_target(chapter, "Scenes", '[data-folder-browser-target="shortcutDropzone"]')
    assert_sidebar_shortcut(chapter, "Scenes", count: 1)

    within_folder_window(chapter) do
      within ".folder-window__sidebar-shortcuts" do
        click_button "Scenes"
      end
    end

    assert_selector ".home__window[data-desktop-window-key='folder_window_#{scenes.id}'] .folder-window__status-segment--current", text: "Scenes"
    assert_selector ".home__window[data-desktop-window-key='folder_window_#{scenes.id}'] .folder-window__sidebar-item", text: "Scenes", count: 1

    visit current_path

    assert_selector ".home__window[data-desktop-window-key='folder_window_#{scenes.id}'] .folder-window__sidebar-item", text: "Scenes"
  end

  test "dragging documents into shortcuts opens a document window on click" do
    chapter = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    document = Document.create!(user: users(:one), title: "Opening", content: "Body", path: "root/Chapter 1/Opening")

    sign_in_as(users(:one))
    visit root_path

    open_folder_window(chapter)
    drag_row_to_target(chapter, "Opening", '[data-folder-browser-target="shortcutDropzone"]')
    assert_sidebar_shortcut(chapter, "Opening", count: 1)

    within_folder_window(chapter) do
      within ".folder-window__sidebar-shortcuts" do
        click_button "Opening"
      end
    end

    assert_selector ".home__window[data-window-kind='document'][data-window-item-id='#{document.id}'] .ig-window__title", text: "Opening"
  end

  test "removing a sidebar shortcut deletes it from the list and persistence" do
    chapter = Folder.create!(user: users(:one), name: "Chapter 1", path: "root/Chapter 1")
    shortcut = users(:one).user_sidebar_shortcuts.create!(
      target_key: "folder:#{chapter.id}",
      item_kind: "folder",
      item_id: chapter.id,
      label: "Chapter 1",
      thumbnail: Folder::FOLDER_SHORTCUT_THUMBNAIL,
      position: 1
    )

    sign_in_as(users(:one))
    visit root_path

    open_folder_window(chapter)

    find(".folder-window__sidebar-item[data-user-sidebar-shortcut-id='#{shortcut.id}']").right_click

    within "[data-folder-browser-target='sidebarContextMenu']:not([hidden])" do
      click_button "Remove"
    end

    assert_no_selector ".folder-window__sidebar-item[data-user-sidebar-shortcut-id='#{shortcut.id}']"

    visit current_path

    assert_no_selector ".folder-window__sidebar-item[data-user-sidebar-shortcut-id='#{shortcut.id}']"
  end

  private

  def open_folder_window(folder)
    execute_script(<<~JS, folder.id, folder.name)
      const desktopElement = document.querySelector("[data-controller~='desktop']")
      const controller = window.Stimulus.getControllerForElementAndIdentifier(desktopElement, "desktop")
      controller.openFolderWindow(arguments[0], arguments[1])
    JS

    assert_selector ".home__window[data-desktop-window-key='folder_window_#{folder.id}'] .folder-window"
  end

  def drag_row_to_target(folder, row_name, target_selector)
    target_position = evaluate_script(<<~JS, folder.id, target_selector)
      (() => {
        const windowEl = document.querySelector(`.home__window[data-desktop-window-key="folder_window_${arguments[0]}"]`)
        const target = windowEl.querySelector(arguments[1])
        const rect = target.getBoundingClientRect()

        return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }
      })()
    JS

    execute_script(<<~JS, folder.id, row_name, target_position["x"], target_position["y"])
      const windowEl = document.querySelector(`.home__window[data-desktop-window-key="folder_window_${arguments[0]}"]`)
      const row = Array.from(windowEl.querySelectorAll(".folder-window__row")).find((element) => element.dataset.itemName === arguments[1])
      const rect = row.getBoundingClientRect()
      const startX = Math.round(rect.left + Math.min(36, rect.width / 3))
      const startY = Math.round(rect.top + rect.height / 2)
      const endX = arguments[2]
      const endY = arguments[3]

      row.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientX: startX,
        clientY: startY
      }))

      window.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientX: startX + 12,
        clientY: startY + 12
      }))

      window.dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientX: endX,
        clientY: endY
      }))

      window.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 1,
        button: 0,
        clientX: endX,
        clientY: endY
      }))
    JS
  end

  def within_folder_window(folder, &block)
    within ".home__window[data-desktop-window-key='folder_window_#{folder.id}']", &block
  end

  def assert_sidebar_shortcut(folder, label, count:)
    assert_sidebar_shortcut_by_key("folder_window_#{folder.id}", label, count: count)
  end

  def assert_sidebar_shortcut_by_key(window_key, label, count:)
    assert_selector ".home__window[data-desktop-window-key='#{window_key}'] .folder-window__sidebar-shortcuts .folder-window__sidebar-item", text: label, count: count
  end

  def assert_no_sidebar_shortcut(folder, label)
    assert_no_selector ".home__window[data-desktop-window-key='folder_window_#{folder.id}'] .folder-window__sidebar-shortcuts .folder-window__sidebar-item", text: label
  end
end

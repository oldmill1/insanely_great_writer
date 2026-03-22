class FoldersController < ApplicationController
  include DesktopItemPayloads

  before_action :authenticate_user!
  before_action :set_folder, only: [ :show, :delete ]

  def show
    assign_folder_view_state(
      id: @folder.id,
      name: @folder.name,
      path: @folder.path,
      show_path: folder_path(@folder)
    )
  end

  def root
    assign_folder_view_state(
      id: nil,
      name: "Root",
      path: VirtualFilesystem.root_path,
      show_path: root_folders_path
    )
    render :show
  end

  def create
    parent_path = VirtualFilesystem.normalize_parent_path(params[:parent_path])
    return head :not_found unless valid_parent_path?(parent_path)

    name = VirtualFilesystem.next_folder_name(user: current_user, parent_path: parent_path)
    folder = current_user.folders.create!(
      name: name,
      path: VirtualFilesystem.build_path(parent_path, name)
    )

    render json: {
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path
      },
      desktop_item: desktop_item_payload(folder)
    }
  end

  def delete
    @folder.soft_delete_tree!
    render json: { deleted: true, item_kind: @folder.kind, item_id: @folder.id }, status: :ok
  end

  private

  def assign_folder_view_state(id:, name:, path:, show_path:)
    @folder_id = id
    @folder_name = name
    @folder_path = path
    @show_path = show_path
    @breadcrumbs = build_breadcrumbs(path:, current_folder_id: id, current_show_path: show_path)
    @frame_id = params[:frame_id].presence || default_frame_id_for(id)
    @children = VirtualFilesystem.children_for(current_user, path)

    parent_path = VirtualFilesystem.parent_path_for(path)
    if path == VirtualFilesystem.root_path
      @parent_folder = nil
      return
    end

    @parent_folder = if parent_path == VirtualFilesystem.root_path
      {
        id: nil,
        name: "Root",
        path: VirtualFilesystem.root_path,
        show_path: root_folders_path
      }
    else
      parent_folder = current_user.folders.active.find_by(path: parent_path)
      if parent_folder.present?
        {
          id: parent_folder.id,
          name: parent_folder.name,
          path: parent_folder.path,
          show_path: folder_path(parent_folder)
        }
      end
    end
  end

  def default_frame_id_for(id)
    return "folder_window_root_content" if id.blank?

    "folder_window_#{id}_content"
  end

  def build_breadcrumbs(path:, current_folder_id:, current_show_path:)
    normalized_path = VirtualFilesystem.normalize_parent_path(path)
    segments = normalized_path.split("/")
    breadcrumb_paths = segments.each_index.map { |index| segments[0..index].join("/") }
    folders_by_path = current_user.folders.active.where(path: breadcrumb_paths.drop(1)).index_by(&:path)

    breadcrumb_paths.map do |breadcrumb_path|
      if breadcrumb_path == VirtualFilesystem.root_path
        {
          id: nil,
          label: VirtualFilesystem.root_path,
          path: VirtualFilesystem.root_path,
          show_path: root_folders_path
        }
      else
        folder = if breadcrumb_path == normalized_path && current_folder_id.present?
          current_user.folders.active.find_by(id: current_folder_id) || folders_by_path[breadcrumb_path]
        else
          folders_by_path[breadcrumb_path]
        end

        {
          id: folder&.id,
          label: breadcrumb_path.split("/").last,
          path: breadcrumb_path,
          show_path: folder.present? ? folder_path(folder) : current_show_path
        }
      end
    end
  end

  def set_folder
    @folder = current_user.folders.active.find(params[:id])
  end

  def valid_parent_path?(parent_path)
    parent_path == VirtualFilesystem.root_path || current_user.folders.active.exists?(path: parent_path)
  end
end

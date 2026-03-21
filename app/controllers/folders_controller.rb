class FoldersController < ApplicationController
  include DesktopItemPayloads

  before_action :authenticate_user!
  before_action :set_folder, only: :show

  def show
    @frame_id = params[:frame_id].presence || "folder_window_#{@folder.id}_content"
    @children = VirtualFilesystem.children_for(current_user, @folder.path)
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

  private

  def set_folder
    @folder = current_user.folders.find(params[:id])
  end

  def valid_parent_path?(parent_path)
    parent_path == VirtualFilesystem.root_path || current_user.folders.exists?(path: parent_path)
  end
end

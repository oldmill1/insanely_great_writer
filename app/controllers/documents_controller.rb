class DocumentsController < ApplicationController
  include DesktopItemPayloads

  before_action :authenticate_user!, only: [ :create, :update ]

  def create
    parent_path = VirtualFilesystem.normalize_parent_path(params[:parent_path])
    return head :not_found unless valid_parent_path?(parent_path)

    title = VirtualFilesystem.next_document_title(user: current_user, parent_path: parent_path)
    document = current_user.documents.create!(
      title: title,
      content: "",
      content_ast: Document::EMPTY_CONTENT_AST,
      path: VirtualFilesystem.build_path(parent_path, title)
    )

    respond_to do |format|
      format.html { redirect_to doc_path(document) }
      format.json do
        render json: {
          document: {
            id: document.id,
            title: document.title,
            path: document.path
          },
          desktop_item: desktop_item_payload(document)
        }
      end
    end
  end

  def show
    @document = Document.find(params[:id])
    @terminal_frame_id = params[:terminal_frame_id].presence || "doc_terminal_screen"
  end

  def update
    document = current_user.documents.find(params[:id])

    if document.update(document_params)
      render json: { saved: true }, status: :ok
    else
      render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def document_params
    permitted = params.require(:document).permit(:content, content_ast: {})
    permitted.to_h
  end

  def valid_parent_path?(parent_path)
    parent_path == VirtualFilesystem.root_path || current_user.folders.exists?(path: parent_path)
  end
end

class DocumentsController < ApplicationController
  include DesktopItemPayloads

  before_action :authenticate_user!, only: [ :create, :update, :delete ]

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
    title = params.dig(:document, :title).to_s.strip

    document.rename_to!(title) if title.present?

    if document.update(document_params)
      render json: {
        saved: true,
        document: {
          id: document.id,
          title: document.title,
          path: document.path
        }
      }, status: :ok
    else
      render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordInvalid => error
    render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
  end

  def delete
    document = current_user.documents.find(params[:id])

    if document.update(is_deleted: true)
      render json: { deleted: true, item_kind: document.kind, item_id: document.id }, status: :ok
    else
      render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def document_params
    permitted = params.require(:document).permit(:content, :title, content_ast: {})
    permitted.delete(:title)
    permitted.to_h
  end

  def valid_parent_path?(parent_path)
    parent_path == VirtualFilesystem.root_path || current_user.folders.exists?(path: parent_path)
  end
end

class DocumentsController < ApplicationController
  before_action :authenticate_user!, only: [ :create, :update ]

  def create
    document = current_user.documents.create!(
      title: draft_title_for(current_user),
      content: ""
    )

    redirect_to doc_path(document)
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
    params.require(:document).permit(:content)
  end

  def draft_title_for(user)
    Time.use_zone(user.timezone) do
      "#{Time.zone.today.strftime("%b %-d")} - Draft"
    end
  end
end

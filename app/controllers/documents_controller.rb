class DocumentsController < ApplicationController
  before_action :authenticate_user!, only: :create

  def create
    document = current_user.documents.create!(
      title: draft_title_for(current_user),
      content: ""
    )

    redirect_to doc_path(document)
  end

  def show
    @document = Document.find(params[:id])
  end

  private

  def draft_title_for(user)
    Time.use_zone(user.timezone) do
      "#{Time.zone.today.strftime("%b %-d")} - Draft"
    end
  end
end

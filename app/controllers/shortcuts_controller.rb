class ShortcutsController < ApplicationController
  POSITION_FIELDS = %i[top right bottom left].freeze
  before_action :authenticate_user!, only: :delete_document

  def update_position
    shortcut = Shortcut.find(params[:id])

    if shortcut.update(position_attributes)
      render json: shortcut.slice(:id, :top, :right, :bottom, :left)
    else
      render json: { errors: shortcut.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def delete_document
    shortcut = Shortcut
      .joins(:document)
      .includes(:document)
      .find_by(id: params[:id], documents: { user_id: current_user.id })
    return head :not_found if shortcut.blank? || shortcut.document.blank?

    document = shortcut.document

    if document.update(is_deleted: true)
      render json: { shortcut_id: shortcut.id, document_id: document.id, is_deleted: document.is_deleted }
    else
      render json: { errors: document.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def position_attributes
    POSITION_FIELDS.index_with do |field|
      raw = params[field]
      raw.present? ? raw.to_i : nil
    end
  end
end

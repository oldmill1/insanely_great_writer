class ShortcutsController < ApplicationController
  POSITION_FIELDS = %i[top right bottom left].freeze

  def update_position
    shortcut = Shortcut.find(params[:id])

    if shortcut.update(position_attributes)
      render json: shortcut.slice(:id, :top, :right, :bottom, :left)
    else
      render json: { errors: shortcut.errors.full_messages }, status: :unprocessable_entity
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

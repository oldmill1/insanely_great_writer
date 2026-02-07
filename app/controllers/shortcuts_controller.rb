class ShortcutsController < ApplicationController
  def update_position
    shortcut = Shortcut.find(params[:id])

    shortcut.update!(
      x: params.require(:x).to_i,
      y: params.require(:y).to_i
    )

    render json: { id: shortcut.id, x: shortcut.x, y: shortcut.y }
  end
end

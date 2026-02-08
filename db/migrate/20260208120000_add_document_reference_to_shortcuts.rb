class AddDocumentReferenceToShortcuts < ActiveRecord::Migration[8.1]
  def change
    add_reference :shortcuts, :document, null: true, foreign_key: true, index: { unique: true }
  end
end
